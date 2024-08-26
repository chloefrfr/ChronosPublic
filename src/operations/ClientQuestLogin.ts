import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import {
  accountService,
  battlepassQuestService,
  config,
  dailyQuestService,
  itemStorageService,
  logger,
  profilesService,
  userService,
  weeklyQuestService,
} from "..";
import ProfileHelper from "../utilities/profiles";
import { QuestManager } from "../utilities/managers/QuestManager";
import MCPResponses from "../utilities/responses";
import { WeeklyQuestGranter } from "../utilities/quests/WeeklyQuestGranter";
import { User } from "../tables/user";
import type { LootList } from "../bot/commands/grantall";
import { v4 as uuid } from "uuid";
import { handleProfileSelection } from "./QueryProfile";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";
import RefreshAccount from "../utilities/refresh";

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

    const [storage, battlepassStorage, weeklyStorage] = await Promise.all([
      dailyQuestService.get(user.accountId),
      battlepassQuestService.getAll(user.accountId),
      weeklyQuestService.getAll(user.accountId),
    ]);

    if (!storage || !battlepassStorage || !weeklyStorage) {
      const error = !storage
        ? "ItemStore 'daily_quest' not found."
        : !battlepassStorage
        ? "ItemStore 'battlepass_quest' not found."
        : "ItemStore 'weekly_quest' not found.";

      return c.json(errors.createError(404, c.req.url, error, timestamp), 404);
    }

    let shouldUpdateProfile = false;
    const multiUpdates: object[] = [];

    if (profileId === "athena") {
      const { past_seasons: pastSeasons, quest_manager: questManager } = profile.stats.attributes;

      if (!questManager) {
        return c.json(errors.createError(400, c.req.url, "Invalid Profile", timestamp), 400);
      }

      const { dailyLoginInterval, dailyQuestRerolls } = questManager;
      const currentSeason = config.currentSeason;

      if (pastSeasons) {
        for (const pastSeason of pastSeasons) {
          if (pastSeason.seasonNumber === currentSeason && dailyLoginInterval !== currentDate) {
            questManager.dailyLoginInterval = currentDate;
            questManager.dailyQuestRerolls = (dailyQuestRerolls || 0) + 1;

            multiUpdates.push({
              changeType: "statModified",
              name: "quest_manager",
              value: {
                dailyLoginInterval: currentDate,
                dailyQuestRerolls: questManager.dailyQuestRerolls,
              },
            });

            const maxDailyQuests = uahelper.season === 13 ? 5 : 3;
            const dailyQuestsNeeded = maxDailyQuests - storage.length;

            if (dailyQuestsNeeded > 0) {
              const dailyQuests = await Promise.all(
                Array.from({ length: dailyQuestsNeeded }, () =>
                  QuestManager.getRandomQuest(user.accountId),
                ),
              );

              for (const dailyQuest of dailyQuests) {
                if (!dailyQuest) continue;

                if (dailyQuest.Name && dailyQuest.Properties.Objectives.length > 1) {
                } else {
                  multiUpdates.push({
                    changeType: "itemAdded",
                    itemId: dailyQuest.Name,
                    item: {
                      templateId: `Quest:${dailyQuest.Name}`,
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
                        [`completion_${dailyQuest.Properties.Objectives[0].BackendName}`]: 0,
                      },
                      quantity: 1,
                    },
                  });

                  const questData = QuestManager.buildBase(
                    dailyQuest.Name,
                    dailyQuest.Properties.Objectives,
                  );
                  await dailyQuestService.add(user.accountId, [{ [dailyQuest.Name]: questData }]);
                }
              }
            }

            shouldUpdateProfile = true;
          }

          const granter = await WeeklyQuestGranter.grant(user.accountId, pastSeason);
          if (!granter) {
            return c.json(
              errors.createError(400, c.req.url, "Failed to grant weekly quests.", timestamp),
              400,
            );
          }

          multiUpdates.push(granter.multiUpdates);

          if (pastSeason.seasonNumber === config.currentSeason) {
            const addQuestItems = (storageList: any[], isBattlepass: boolean) => {
              storageList.forEach((obj) => {
                const questKey = Object.keys(obj)[0];
                const templateId = obj[questKey].templateId;
                const objective = obj[questKey].attributes.ObjectiveState[0];

                const newQuestItem = {
                  changeType: "itemAdded",
                  itemId: templateId,
                  item: {
                    templateId: templateId,
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
                      [objective.Name]: isBattlepass ? objective.Stage : objective.Value,
                    },
                    quantity: 1,
                  },
                };

                multiUpdates.push(newQuestItem);
                shouldUpdateProfile = true;
              });
            };

            addQuestItems(storage, false);
            addQuestItems(battlepassStorage, true);
          }
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

      await RefreshAccount(user.accountId, user.username);
    }

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.updateMultiple([
        { accountId: user.accountId, type: "athena", data: profile },
        { accountId: user.accountId, type: "common_core", data: common_core },
      ]);
    }

    return c.json(MCPResponses.generate(profile, multiUpdates, profileId));
  } catch (error) {
    logger.error(`ClientQuestLogin: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
