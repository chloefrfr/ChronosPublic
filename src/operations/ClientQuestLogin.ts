import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import {
  accountService,
  config,
  itemStorageService,
  logger,
  profilesService,
  userService,
} from "..";
import ProfileHelper from "../utilities/profiles";
import { QuestManager } from "../utilities/managers/QuestManager";
import MCPResponses from "../utilities/responses";
import { Profiles } from "../tables/profiles";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");
  const timestamp = new Date().toISOString();
  const currentDate = new Date().toISOString().slice(0, 10);

  if (!useragent || !accountId || !rvn || !profileId) {
    return c.json(
      errors.createError(400, c.req.url, "Missing required parameters.", timestamp),
      400,
    );
  }

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "User or account not found.", timestamp),
        404,
      );
    }

    let profile;

    switch (profileId) {
      case "athena":
        profile = await ProfileHelper.getProfile(user.accountId, "athena");
        break;
      case "common_core":
        profile = await ProfileHelper.getProfile(user.accountId, "common_core");
        break;
      case "common_public":
        profile = await ProfileHelper.getProfile(user.accountId, "common_public");
    }

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

    const uahelper = uaparser(useragent);

    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    const storage = await itemStorageService.getItemByType("daily_quest");

    if (!storage) {
      return c.json(
        errors.createError(404, c.req.url, "ItemStore 'daily_quest' not found.", timestamp),
        404,
      );
    }

    let shouldUpdateProfile = false;
    const multiUpdates: object[] = [];

    for (const pastSeasons of profile.stats.attributes.past_seasons!) {
      if (
        pastSeasons.seasonNumber === config.currentSeason &&
        profile.stats.attributes.quest_manager!.dailyLoginInterval !== currentDate
      ) {
        profile.stats.attributes.quest_manager!.dailyLoginInterval = currentDate;
        profile.stats.attributes.quest_manager!.dailyQuestRerolls += 1;

        const maxDailyQuests = 5;
        const currentQuestCount = Object.values(storage.data).length;

        const questsToAdd = Math.max(0, maxDailyQuests - currentQuestCount);

        logger.debug(`Adding ${questsToAdd} daily quests.`);

        for (let i = 0; i < questsToAdd; i++) {
          const dailyQuests = await QuestManager.getRandomQuest();

          if (!dailyQuests) continue;

          const questData = QuestManager.buildBase(
            dailyQuests.Name,
            dailyQuests.Properties.Objectives,
          );

          await itemStorageService.addItem(
            {
              [dailyQuests.Name]: [questData],
            },
            "daily_quest",
          );
          logger.debug(`Added quest: ${dailyQuests.Name}`);

          const newQuestItem = {
            changeType: "itemAdded",
            itemId: dailyQuests.Name,
            item: {
              templateId: questData.templateId,
              attributes: {
                creation_time: new Date().toISOString(),
                level: -1,
                item_seen: false,
                playlists: [],
                sent_new_notification: true,
                challenge_bundle_id: "",
                xp_reward_scalar: 1,
                challenge_linked_quest_given: "",
                quest_pool: "",
                quest_state: "Active",
                bucket: "",
                last_state_change_time: new Date().toISOString(),
                challenge_linked_quest_parent: "",
                max_level_bonus: 0,
                xp: 0,
                quest_rarity: "uncommon",
                favorite: false,
                [`completion_${dailyQuests.Properties.Objectives[0].BackendName}`]: 0,
              },
              quantity: 1,
            },
          };

          multiUpdates.push(newQuestItem);
        }

        shouldUpdateProfile = true;
      }
    }

    // trying something new (this should be faster)
    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, "athena", profile);
    }

    return c.json(MCPResponses.generate(profile, multiUpdates, profileId));
  } catch (error) {
    logger.error(`ClientQuestLogin: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
