import type { Context } from "hono";
import {
  accountService,
  battlepassQuestService,
  config,
  dailyQuestService,
  logger,
  profilesService,
  userService,
  weeklyQuestService,
} from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";
import uaparser from "../utilities/uaparser";

export default async function (c: Context) {
  const timestamp = new Date().toISOString();

  try {
    const accountId = c.req.param("accountId");
    const profileId = c.req.query("profileId") as ProfileId;

    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
        404,
      );
    }

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile && profileId !== "athena" && profileId !== "common_core")
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );

    if (!profile)
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );

    const athena = await handleProfileSelection("athena", user.accountId);

    if (!athena)
      return c.json(
        errors.createError(404, c.req.url, `Profile 'athena' not found.`, timestamp),
        404,
      );

    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body is not valid.", timestamp), 400);
    }

    let shouldUpdateProfile: boolean = false;
    const applyProfileChanges: object[] = [];

    const uahelper = uaparser(c.req.header("User-Agent"));

    if (!uahelper) {
      return c.json(errors.createError(400, c.req.url, "Invalid User-Agent.", timestamp), 400);
    }

    const { itemIds } = body;

    for (const id of itemIds) {
      const dailyQuest = await dailyQuestService.getQuest(user.accountId, id);
      const battlepassQuests = await battlepassQuestService.get(
        user.accountId,
        uahelper.season,
        id,
      );
      const weeklyQuests = await weeklyQuestService.get(user.accountId, config.currentSeason, id);

      if (dailyQuest) {
        dailyQuest.attributes.sent_new_notification = true;
        profile.items[id].attributes.sent_new_notification = true;

        await Promise.all([dailyQuestService.updateQuest(user.accountId, id, dailyQuest)]);

        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId: id,
          attributeNam: "sent_new_notification",
          attributeValue: true,
        });

        shouldUpdateProfile = true;
      }

      if (battlepassQuests) {
        battlepassQuests[id].attributes.sent_new_notification = true;
        profile.items[id].attributes.sent_new_notification = true;

        await Promise.all([
          battlepassQuestService.update(user.accountId, config.currentSeason, battlepassQuests),
        ]);

        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId: id,
          attributeNam: "sent_new_notification",
          attributeValue: true,
        });

        shouldUpdateProfile = true;
      }

      if (weeklyQuests) {
        weeklyQuests[id].attributes.sent_new_notification = true;

        await Promise.all([
          weeklyQuestService.update(user.accountId, config.currentSeason, weeklyQuests),
        ]);

        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId: id,
          attributeNam: "sent_new_notification",
          attributeValue: true,
        });

        shouldUpdateProfile = true;
      }
    }

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.updateMultiple([
        {
          type: "athena",
          accountId: user.accountId,
          data: profile,
        },
      ]);
    }

    return c.json(MCPResponses.generate(profile, [], profileId));
  } catch (error) {
    logger.error(`MarkNewQuestNotificationSent: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
  }
}
