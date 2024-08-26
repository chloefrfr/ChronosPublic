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

    const updates: { changeType: "itemAdded" | "itemRemoved"; itemId: string; item?: any }[] = [];
    const grantedBundles: string[] = [];
    let challengeBundleScheduleId = "";
    const grantedQuestInstanceIds: string[] = [];
    let grantItems = true;

    const profile = await handleProfileSelection("athena", accountId);
    if (!profile) {
      return { multiUpdates: [], shouldGrantItems: false };
    }

    const questPromises = weeklyQuests.map(async (quest) => {
      const bundleName = `ChallengeBundle:${quest.Name}`;
      grantedBundles.push(bundleName);
      challengeBundleScheduleId = quest.ChallengeBundleSchedule;

      const bundlePromises = quest.Objects.map(async (questBundle) => {
        try {
          if (await weeklyQuestService.get(accountId, quest.Name)) {
            logger.warn("Quests already exist.");
            return;
          }

          if (questBundle.Options.bRequiresVIP && !pastSeasons.purchasedVIP) {
            grantItems = false;
            return;
          }

          if (!questBundle.Options.hasExtra) {
            const objectiveStates = questBundle.Objectives.map((objective) => ({
              BackendName: `completion_${objective.BackendName}`,
              Stage: 0,
              Count: objective.Count,
            }));

            const newQuestData = {
              templateId: questBundle.Name,
              attributes: {
                challenge_bundle_id: bundleName,
                sent_new_notification: false,
                ObjectiveState: objectiveStates,
              },
              quantity: 1,
            };

            await weeklyQuestService.add(accountId, [{ [questBundle.Name]: newQuestData }]);

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
                ...objectiveStates.reduce(
                  (acc, { BackendName, Count }) => ({
                    ...acc,
                    [BackendName]: Count,
                  }),
                  {},
                ),
              },
              quantity: 1,
            };

            updates.push({
              changeType: "itemAdded",
              itemId: questBundle.Name,
              item: itemResponse,
            });

            grantedQuestInstanceIds.push(questBundle.Name);
          }
        } catch (error) {
          logger.error(`Error granting weekly quests: ${error}`);
          grantItems = false;
        }
      });

      await Promise.all(bundlePromises);
    });

    await Promise.all(questPromises);

    const bundleItemResponse = {
      templateId: challengeBundleScheduleId,
      attributes: {
        has_unlock_by_completion: false,
        num_quests_completed: 0,
        level: 0,
        grantedquestinstanceids: grantedQuestInstanceIds,
        item_seen: false,
        max_allowed_bundle_level: 0,
        num_granted_bundle_quests: grantedQuestInstanceIds.length,
        max_level_bonus: 0,
        challenge_bundle_schedule_id: challengeBundleScheduleId,
        num_progress_quests_completed: 0,
        xp: 0,
        favorite: false,
      },
      quantity: 1,
    };

    const scheduleItemResponse = {
      templateId: challengeBundleScheduleId,
      attributes: {
        unlock_epoch: new Date().toISOString(),
        max_level_bonus: 0,
        level: 1,
        item_seen: false,
        xp: 0,
        favorite: false,
        granted_bundles: grantedBundles,
      },
      quantity: 1,
    };

    profile.items[challengeBundleScheduleId] = scheduleItemResponse;
    profile.items[`ChallengeBundle:${weeklyQuests[0]?.Name || "Unknown"}`] = bundleItemResponse;

    await profilesService.updateMultiple([{ accountId, type: "athena", data: profile }]);

    updates.push(
      { changeType: "itemRemoved", itemId: challengeBundleScheduleId },
      { changeType: "itemAdded", itemId: challengeBundleScheduleId, item: scheduleItemResponse },
    );

    for (const quests of weeklyQuests) {
      updates.push(
        {
          changeType: "itemRemoved",
          itemId: `ChallengeBundle:${quests.Name}`,
        },
        {
          changeType: "itemAdded",
          itemId: `ChallengeBundle:${quests.Name}`,
          item: bundleItemResponse,
        },
      );
    }

    return { multiUpdates: updates, shouldGrantItems: grantItems };
  }
}
