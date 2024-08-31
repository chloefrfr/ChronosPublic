import { config, logger, profilesService, questsService } from "../..";
import { handleProfileSelection } from "../../operations/QueryProfile";
import type { PastSeasons } from "../managers/LevelsManager";
import { QuestManager, type Objectives } from "../managers/QuestManager";
import RefreshAccount from "../refresh";

export namespace WeeklyQuestGranter {
  export async function grant(accountId: string, username: string, pastSeasons: PastSeasons) {
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

    const questDataMap = new Map<string, any>();
    const bundleResponsesMap = new Map<string, any>();

    const profile = await handleProfileSelection("athena", accountId);
    if (!profile) {
      return { multiUpdates: [], shouldGrantItems: false };
    }

    for (const quest of weeklyQuests) {
      const bundleName = `ChallengeBundle:${quest.Name}`;
      grantedBundles.add(bundleName);
      challengeBundleScheduleId = quest.ChallengeBundleSchedule;

      for (const questBundle of quest.Objects) {
        try {
          const existingQuest = await questsService.findQuestByTemplateId(
            accountId,
            config.currentSeason,
            questBundle.Name,
          );

          if (existingQuest) {
            for (const rewards of questBundle.Rewards) {
              if (rewards.TemplateId.startsWith("Quest:")) {
                const objectiveStates = questBundle.Objectives.reduce(
                  (acc, { BackendName, Count }) => ({
                    ...acc,
                    [`completion_${BackendName}`]: Count,
                  }),
                  {},
                );

                const newQuestData = {
                  accountId,
                  profileId: "athena",
                  templateId: questBundle.Name,
                  entity: {
                    challenge_bundle_id: bundleName,
                    sent_new_notification: false,
                    ObjectiveState: questBundle.Objectives.map(({ BackendName, Count }) => ({
                      BackendName: `completion_${BackendName}`,
                      Stage: 0,
                      Count,
                    })),
                  },
                  isDaily: false,
                  season: config.currentSeason,
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

                grantedQuestInstanceIds.add(rewards.TemplateId);
                questDataMap.set(rewards.TemplateId, newQuestData);
                bundleResponsesMap.set(rewards.TemplateId, itemResponse);
              }
            }
            continue;
          }

          if (questBundle.Options.bRequiresVIP && !pastSeasons.purchasedVIP) {
            grantItems = false;
            continue;
          }

          if (questBundle.Options.hasExtra) continue;

          const objectiveStates = questBundle.Objectives.reduce(
            (acc, { BackendName, Count }) => ({
              ...acc,
              [`completion_${BackendName}`]: Count,
            }),
            {},
          );

          const newQuestData = {
            accountId,
            profileId: "athena",
            templateId: questBundle.Name,
            entity: {
              challenge_bundle_id: bundleName,
              sent_new_notification: false,
              ObjectiveState: questBundle.Objectives.map(({ BackendName, Count }) => ({
                BackendName: `completion_${BackendName}`,
                Stage: 0,
                Count,
              })),
            },
            isDaily: false,
            season: config.currentSeason,
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
          logger.error(`Error generating quest bundle: ${error}`);
          grantItems = false;
        }
      }
    }

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

      updates.push({ changeType: "itemAdded", itemId: bundle, item: bundleItemResponse });
    });

    updates.push({
      changeType: "itemAdded",
      itemId: challengeBundleScheduleId,
      item: scheduleItemResponse,
    });

    try {
      await profilesService.updateMultiple([{ accountId, type: "athena", data: profile }]);

      const questDataArray = Array.from(questDataMap.values()).map((data) => ({
        ...data,
        accountId,
        profileId: "athena",
      }));

      if (questDataArray.length > 0) {
        await questsService.addQuests(questDataArray);
      }

      await RefreshAccount(accountId, username);
    } catch (error) {
      logger.error(`Error updating profile or adding quests: ${error}`);
    }

    return { multiUpdates: updates, shouldGrantItems: grantItems };
  }
}
