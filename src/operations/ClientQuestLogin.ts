import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import {
  accountService,
  config,
  dailyQuestService,
  itemStorageService,
  logger,
  profilesService,
  userService,
} from "..";
import ProfileHelper from "../utilities/profiles";
import { QuestManager } from "../utilities/managers/QuestManager";
import MCPResponses from "../utilities/responses";
import { Profiles } from "../tables/profiles";
import { WeeklyQuestGranter } from "../utilities/granting/WeeklyQuestGranter";
import { User } from "../tables/user";
import type { LootList } from "../bot/commands/grantall";
import { v4 as uuid } from "uuid";
import { handleProfileSelection } from "./QueryProfile";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";

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

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile && profileId !== "athena" && profileId !== "common_core") {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );
    }
    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );
    }

    const common_core = await ProfileHelper.getProfile(user.accountId, "common_core");
    if (!common_core) {
      return c.json(
        errors.createError(404, c.req.url, `Profile 'common_core' not found.`, timestamp),
        404,
      );
    }

    const uahelper = uaparser(useragent);
    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    const storage = await dailyQuestService.get(user.accountId);
    if (!storage) {
      return c.json(
        errors.createError(404, c.req.url, "ItemStore 'daily_quest' not found.", timestamp),
        404,
      );
    }

    let shouldUpdateProfile = false;
    const multiUpdates: object[] = [];

    if (profileId === "athena") {
      for (const pastSeasons of profile.stats.attributes.past_seasons!) {
        if (
          pastSeasons.seasonNumber === config.currentSeason &&
          profile.stats.attributes.quest_manager!.dailyLoginInterval !== currentDate
        ) {
          profile.stats.attributes.quest_manager!.dailyLoginInterval = currentDate;
          profile.stats.attributes.quest_manager!.dailyQuestRerolls += 1;

          let maxDailyQuests = 5;

          if (uahelper.season < 10) maxDailyQuests = 3;

          const currentQuestCount = storage.length;
          const questsToAdd = Math.max(0, maxDailyQuests - currentQuestCount);

          for (let i = 0; i < questsToAdd; i++) {
            const dailyQuests = await QuestManager.getRandomQuest(user.accountId);
            if (!dailyQuests) continue;

            const questData = QuestManager.buildBase(
              dailyQuests.Name,
              dailyQuests.Properties.Objectives,
            );

            await dailyQuestService.add(user.accountId, [
              {
                [dailyQuests.Name]: questData,
              },
            ]);

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
    }

    const now = new Date(currentDate);
    const lastLoginDate = new Date(user.lastLogin || 0);

    if (lastLoginDate.toDateString() !== now.toDateString()) {
      await User.createQueryBuilder()
        .update(User)
        .set({ lastLogin: now.toISOString() })
        .where("accountId = :accountId", { accountId: user.accountId })
        .execute();

      const lootList: LootList[] = [
        {
          itemType: "Currency:MtxGiveaway",
          itemGuid: "Currency:MtxGiveaway",
          itemProfile: "common_core",
          quantity: 50,
        },
      ];

      common_core.items["Currency:MtxPurchased"].quantity += 50;

      const randomGiftBoxId = uuid();
      const giftBox = {
        changeType: "itemAdded",
        itemId: randomGiftBoxId,
        item: {
          templateId: "GiftBox:GB_MakeGood",
          attributes: {
            fromAccountId: "Server",
            lootList,
            params: {
              userMessage: "Thanks for playing!",
            },
          },
          quantity: 1,
        },
      };

      multiUpdates.push(giftBox);
      common_core.stats.attributes.gifts!.push({
        templateId: "GiftBox:GB_MakeGood",
        attributes: {
          fromAccountId: "Server",
          lootList,
          params: {
            userMessage: "Thanks for playing!",
          },
        },
        quantity: 1,
      });

      if (uahelper.season >= 1 && uahelper.season <= 9) {
        profile.items[uuid()] = {
          templateId: "GiftBox:GB_MakeGood",
          attributes: {
            fromAccountId: "Server",
            lootList,
            params: {
              userMessage: "Thanks for playing!",
            },
          },
          quantity: 1,
        };
      }

      SendMessageToId(
        JSON.stringify({
          payload: {},
          type: "com.epicgames.gift.received",
          timestamp: now.toISOString(),
        }),
        user.accountId,
      );
    }

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await Promise.all([
        profilesService.update(user.accountId, "athena", profile),
        profilesService.update(user.accountId, "common_core", common_core),
      ]);
    }

    return c.json(MCPResponses.generate(profile, multiUpdates, profileId));
  } catch (error) {
    logger.error(`ClientQuestLogin: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
