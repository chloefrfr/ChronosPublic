import { logger, profilesService, weeklyQuestService } from "../..";
import { handleProfileSelection } from "../../operations/QueryProfile";
import type { PastSeasons } from "../managers/LevelsManager";
import { QuestManager, type Objectives } from "../managers/QuestManager";

export namespace WeeklyQuestGranter {
  export async function grant(accountId: string, pastSeasons: PastSeasons) {
    const weeklyQuests = Array.from(QuestManager.listedWeeklyQuests);

    if (weeklyQuests.length === 0) {
      return { multiUpdates: [], shouldGrantItems: false };
    }

    const updates: Array<{ changeType: "itemAdded" | "itemRemoved"; itemId: string; item?: any }> =
      [];
    const grantedBundles = new Set<string>();
    let challengeBundleScheduleId = "";
    const grantedQuestInstanceIds = new Set<string>();
    let grantItems = true;

    const profile = await handleProfileSelection("athena", accountId);
    if (!profile) {
      return { multiUpdates: [], shouldGrantItems: false };
    }

    const questDataMap = new Map<string, any>();
    const bundleResponsesMap = new Map<string, any>();

    const questPromises = weeklyQuests.map(async (quest) => {
      const bundleName = `ChallengeBundle:${quest.Name}`;
      grantedBundles.add(bundleName);
      challengeBundleScheduleId = quest.ChallengeBundleSchedule;

      const bundlePromises = quest.Objects.map(async (questBundle) => {
        try {
          if (await weeklyQuestService.get(accountId, quest.Name)) {
            logger.warn("Quests already exist.");
            return null;
          }

          if (questBundle.Options.bRequiresVIP && !pastSeasons.purchasedVIP) {
            grantItems = false;
            return null;
          }

          if (questBundle.Options.hasExtra) return null;

          const objectiveStates = questBundle.Objectives.reduce(
            (acc, { BackendName, Count }) => ({
              ...acc,
              [`completion_${BackendName}`]: Count,
            }),
            {},
          );

          const newQuestData = {
            templateId: questBundle.Name,
            attributes: {
              challenge_bundle_id: bundleName,
              sent_new_notification: false,
              ObjectiveState: questBundle.Objectives.map(({ BackendName, Count }) => ({
                BackendName: `completion_${BackendName}`,
                Stage: 0,
                Count,
              })),
            },
            quantity: 1,
          };

          const itemResponse = {
            templateId: questBundle.Name,
            attributes: {
              creation_time: new Date().toISOString(),
              level: -1,
              item_seen: false,
              playlists: [],
              sent_new_notification: true,
              challenge_bundle_id: bundleName,
              xp_reward_scalar: 1,
              quest_state: "Active",
              last_state_change_time: new Date().toISOString(),
              quest_rarity: "uncommon",
              favorite: false,
              ...objectiveStates,
            },
            quantity: 1,
          };

          grantedQuestInstanceIds.add(questBundle.Name);
          questDataMap.set(questBundle.Name, newQuestData);
          bundleResponsesMap.set(questBundle.Name, itemResponse);
        } catch (error) {
          logger.error(`Error processing quest bundle: ${error}`);
          grantItems = false;
        }
      });

      await Promise.all(bundlePromises);
    });

    await Promise.all(questPromises);

    const scheduleItemResponse = {
      templateId: challengeBundleScheduleId,
      attributes: {
        unlock_epoch: new Date().toISOString(),
        max_level_bonus: 0,
        level: 1,
        item_seen: false,
        xp: 0,
        favorite: false,
        granted_bundles: Array.from(grantedBundles),
      },
      quantity: 1,
    };

    profile.items[challengeBundleScheduleId] = scheduleItemResponse;

    grantedBundles.forEach((bundle) => {
      const bundleItemResponse = {
        templateId: bundle,
        attributes: {
          has_unlock_by_completion: false,
          num_quests_completed: 0,
          level: 0,
          grantedquestinstanceids: Array.from(grantedQuestInstanceIds),
          item_seen: false,
          max_allowed_bundle_level: 0,
          num_granted_bundle_quests: grantedQuestInstanceIds.size,
          max_level_bonus: 0,
          challenge_bundle_schedule_id: challengeBundleScheduleId,
          num_progress_quests_completed: 0,
          xp: 0,
          favorite: false,
        },
        quantity: 1,
      };

      profile.items[bundle] = bundleItemResponse;

      updates.push(
        { changeType: "itemRemoved", itemId: bundle },
        { changeType: "itemAdded", itemId: bundle, item: bundleItemResponse },
      );
    });

    updates.push(
      { changeType: "itemRemoved", itemId: challengeBundleScheduleId },
      { changeType: "itemAdded", itemId: challengeBundleScheduleId, item: scheduleItemResponse },
    );

    await profilesService.updateMultiple([{ accountId, type: "athena", data: profile }]);

    const addQuests = async (quests: Array<{ [key: string]: any }>) => {
      try {
        if (quests.length > 0) {
          await weeklyQuestService.add(accountId, quests);
        }
      } catch (error) {
        logger.error(`Error adding quests: ${error}`);
      }
    };

    const questChunks = Array.from(questDataMap.values()).map((data) => ({
      [data.templateId]: data,
    }));
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await addQuests(questChunks);
        break;
      } catch (error) {
        retryCount++;
        logger.error(`Retry ${retryCount}/${maxRetries} failed: ${error}`);
      }
    }

    return { multiUpdates: updates, shouldGrantItems: grantItems };
  }
}
