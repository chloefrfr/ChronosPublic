import { battlepassQuestService, logger } from "../..";
import type { PastSeasons } from "../managers/LevelsManager";
import { QuestManager, type Objectives } from "../managers/QuestManager";

// Enhanced and more readable version of WeeklyQuestGranter
export namespace WeeklyQuestGranter {
  export async function grant(pastSeasons: PastSeasons, accountId: string) {
    const grantedQuestInstanceIds: string[] = [];
    const multiUpdates: object[] = [];
    let XPQuantity: number = 0;

    const weeklyQuests = QuestManager.listedWeeklyQuests;

    if (!weeklyQuests || weeklyQuests.length === 0) {
      return { multiUpdates, XPQuantity };
    }

    for (const quest of weeklyQuests) {
      if (!quest) {
        continue;
      }

      let canGrantItems = true;
      const listOfSchedules: string[] = [];
      const listOfBundles: string[] = [];

      listOfSchedules.push(quest.ChallengeBundleSchedule);

      for (const bundle of quest.Objects) {
        if (bundle.Options.bRequiresVIP && !pastSeasons.purchasedVIP) {
          canGrantItems = false;
          break;
        }

        listOfBundles.push(`ChallengeBundle:${bundle.Name}`);

        if (canGrantItems) {
          try {
            const storage = await battlepassQuestService.get(accountId, bundle.Name);

            if (!storage) {
              const objectives: Objectives[] = bundle.Objectives.map((questObj) => ({
                BackendName: `completion_${questObj.BackendName}`,
                Stage: 0,
                Count: questObj.Count,
              }));

              await battlepassQuestService.add(accountId, [
                {
                  [bundle.Name]: {
                    templateId: bundle.Name,
                    attributes: {
                      challenge_bundle_id: `ChallengeBundle:${bundle.Name}`,
                      sent_new_notification: false,
                      ObjectiveState: objectives,
                    },
                    quantity: 1,
                  },
                },
              ]);

              const object = {
                templateId: bundle.Name,
                attributes: {
                  creation_time: new Date().toISOString(),
                  level: -1,
                  item_seen: false,
                  playlists: [],
                  sent_new_notification: true,
                  challenge_bundle_id: `ChallengeBundle:${bundle.Name}`,
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

              objectives.forEach((obj) => {
                // @ts-ignore
                object.attributes[obj.BackendName] = obj.Stage;
              });

              multiUpdates.push({
                changeType: "itemAdded",
                itemId: bundle.Name,
                item: object,
              });
            }

            for (const reward of bundle.Rewards) {
              if (reward.TemplateId.includes("AccountResource:athenaseasonalxp")) {
                XPQuantity += reward.Quantity;
              }
            }

            const scheduleObject = {
              templateId: quest.ChallengeBundleSchedule,
              attributes: {
                unlock_epoch: new Date().toISOString(),
                max_level_bonus: 0,
                level: -1,
                item_seen: true,
                xp: 0,
                favorite: false,
                granted_bundles: listOfBundles,
              },
            };

            multiUpdates.push({
              changeType: "itemRemoved",
              itemId: quest.ChallengeBundleSchedule,
            });

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: quest.ChallengeBundleSchedule,
              item: scheduleObject,
            });
          } catch (error) {
            logger.error(`Error granting quest: ${error}`);
          }
        }
      }
    }

    return {
      multiUpdates,
      XPQuantity,
    };
  }
}
