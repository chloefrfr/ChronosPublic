import { battlepassQuestService } from "../..";
import type { PastSeasons } from "../managers/LevelsManager";
import { QuestManager, type Objectives } from "../managers/QuestManager";
import RefreshAccount from "../refresh";

export namespace BattlepassQuestGranter {
  export async function grant(accountId: string, username: string, templateId: string) {
    const battlepassQuests = QuestManager.listedBattlepassQuests;

    if (!battlepassQuests) {
      return { multiUpdates: [] };
    }

    const filteredMatchingQuest = Array.from(battlepassQuests).filter(
      (q) => q.ChallengeBundleSchedule === templateId,
    );

    if (!filteredMatchingQuest) {
      return { multiUpdates: [] };
    }

    const updates: Array<{
      changeType: "itemAdded" | "itemRemoved";
      itemId: string;
      item?: any;
    }> = [];

    const listOfBundles: Record<string, string[]> = {};

    for (const questData of filteredMatchingQuest) {
      if (!listOfBundles[questData.ChallengeBundleSchedule]) {
        listOfBundles[questData.ChallengeBundleSchedule] = [];
      }

      listOfBundles[questData.ChallengeBundleSchedule].push(`ChallengeBundle:${questData.Name}`);

      const listOfQuests: string[] = [];
      let currentXP = 0;

      for (const quest of questData.Objects) {
        if (quest.Options.hasExtra) continue;

        listOfQuests.push(quest.Name);

        const storage = await battlepassQuestService.get(accountId, quest.Name);

        if (!storage) {
          const ObjectiveState: Objectives[] = quest.Objectives.map((objective) => {
            const isXPObjective =
              objective.BackendName.toLowerCase().includes("athena_season_xp_gained");
            const value = isXPObjective ? Math.min(currentXP, objective.Count) : 0;

            return {
              BackendName: `completion_${objective.BackendName}`,
              Stage: value,
              Count: objective.Count,
            };
          });

          await battlepassQuestService.add(accountId, [
            {
              [quest.Name]: {
                templateId: quest.Name,
                attributes: {
                  challenge_bundle_id: `ChallengeBundle:${questData.Name}`,
                  sent_new_notification: false,
                  ObjectiveState,
                },
                quantity: 1,
              },
            },
          ]);

          const newQuestItem = {
            templateId: quest.Name,
            attributes: {
              creation_time: new Date().toISOString(),
              level: -1,
              item_seen: false,
              playlists: [],
              sent_new_notification: true,
              challenge_bundle_id: `ChallengeBundle:${questData.Name}`,
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
            },
            quantity: 1,
          };

          for (const obj of ObjectiveState) {
            // @ts-ignore
            newQuestItem.attributes[obj.BackendName] = obj.Stage;
          }

          updates.push({
            changeType: "itemAdded",
            itemId: quest.Name,
            item: newQuestItem,
          });

          await RefreshAccount(accountId, username);
        }
      }

      let updatedSchedule = questData.ChallengeBundleSchedule;
      if (!updatedSchedule.startsWith("ChallengeBundleSchedule:")) {
        updatedSchedule = `ChallengeBundleSchedule:${updatedSchedule}`;
      }

      const bundleAttributes = {
        has_unlock_by_completion: false,
        num_quests_completed: 0,
        level: 0,
        grantedquestinstanceids: listOfQuests,
        item_seen: true,
        max_allowed_bundle_level: 0,
        num_granted_bundle_quests: listOfQuests.length,
        max_level_bonus: 0,
        challenge_bundle_schedule_id: updatedSchedule,
        num_progress_quests_completed: 0,
        xp: 0,
        favorite: false,
      };

      updates.push({
        changeType: "itemRemoved",
        itemId: `ChallengeBundle:${questData.Name}`,
      });

      updates.push({
        changeType: "itemAdded",
        itemId: `ChallengeBundle:${questData.Name}`,
        item: bundleAttributes,
      });
    }

    for (const key in listOfBundles) {
      const bundle = listOfBundles[key];

      const newQuestItem = {
        templateId: key,
        attributes: {
          unlock_epoch: new Date().toISOString(),
          max_level_bonus: 0,
          level: 0,
          item_seen: true,
          xp: 0,
          favorite: false,
          granted_bundles: bundle,
        },
        quantity: 1,
      };

      updates.push({
        changeType: "itemRemoved",
        itemId: key,
      });

      updates.push({
        changeType: "itemAdded",
        itemId: key,
        item: newQuestItem,
      });
    }

    await RefreshAccount(accountId, username);

    return { multiUpdates: updates };
  }
}
