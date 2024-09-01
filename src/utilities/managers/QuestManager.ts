import path from "node:path";
import fs from "node:fs/promises";
import { logger, profilesService, questsService } from "../..";
import Config from "../../wrappers/Env.wrapper";
import { handleProfileSelection } from "../../operations/QueryProfile";

interface DailyQuestDef {
  Type: string;
  Name: string;
  Class: string;
  Properties: DailyQuestProps;
}

interface BattlepassQuestDef {
  Name: string;
  ChallengeBundleSchedule: string;
  Level: number;
  Objects: BattlepassQuestObjects[];
}

interface BattlepassQuestObjects {
  Name: string;
  Options: ObjectsOptions;
  Rewards: ObjectsRewards[];
  Objectives: Objectives[];
}

export interface Objectives {
  BackendName: string;
  Count: number;
  Stage: number;
}

interface ObjectsRewards {
  TemplateId: string;
  Quantity: number;
}

interface ObjectsOptions {
  bRequiresVIP: boolean;
  hasExtra: boolean;
}

interface DailyQuestProps {
  DisplayName: string;
  Description: string;
  SeasonXP: number;
  SeasonBattleStars: number;
  Objectives: DailyQuestObjectives[];
}

interface DailyQuestObjectives {
  BackendName: string;
  ObjectiveState: string;
  ItemEvent: string;
  ItemReference: string;
  ItemTemplateIdOverride: string;
  Description: string;
  HudShortDescription: string;
  Count: number;
  Stage: number;
  bHidden: boolean;
}

export enum QuestType {
  REPEATABLE = "repeatable",
  SEASONAL = "seasonal",
  BATTLEPASS = "battlepass",
  WEEKLY = "weekly",
}

const config = new Config().getConfig();
const baseFolder = path.join(
  __dirname,
  "..",
  "..",
  "memory",
  "season",
  "quests",
  `Season${config.currentSeason}`,
);

export namespace QuestManager {
  export const listedQuests: Record<QuestType, Map<string, DailyQuestDef>> = {
    [QuestType.REPEATABLE]: new Map(),
    [QuestType.SEASONAL]: new Map(),
    [QuestType.BATTLEPASS]: new Map(),
    [QuestType.WEEKLY]: new Map(),
  };

  export const listedBattlepassQuests: Set<BattlepassQuestDef> = new Set();
  export const listedWeeklyQuests: Set<BattlepassQuestDef> = new Set();

  function isDailyQuest(quest: DailyQuestDef | BattlepassQuestDef): quest is DailyQuestDef {
    return (quest as DailyQuestDef).Type !== undefined;
  }

  async function readAllQuests(folder: string): Promise<void> {
    const files = await fs.readdir(folder);

    const fileReadPromises = files.map(async (file) => {
      const filePath = path.join(folder, file);

      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await readAllQuests(filePath);
      } else if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const quest = JSON.parse(content) as DailyQuestDef | BattlepassQuestDef;

          if (isDailyQuest(quest)) {
            const type = folder.includes("repeatable")
              ? QuestType.REPEATABLE
              : folder.includes("seasonal")
              ? QuestType.SEASONAL
              : folder.includes("battlepass")
              ? QuestType.BATTLEPASS
              : folder.includes("weekly")
              ? QuestType.WEEKLY
              : undefined;

            if (type) {
              if (!listedQuests[type].has(quest.Name)) {
                listedQuests[type].set(quest.Name, quest);
              }
            }
          } else {
            const bpQuest = quest as BattlepassQuestDef;
            if (!listedBattlepassQuests.has(bpQuest)) {
              listedBattlepassQuests.add(bpQuest);
            }
            if (folder.includes("weekly")) {
              if (!listedWeeklyQuests.has(bpQuest)) {
                listedWeeklyQuests.add(bpQuest);
              }
            }
          }
        } catch (error) {
          logger.error(`Error parsing Quest ${file}: ${error}`);
        }
      }
    });

    await Promise.all(fileReadPromises);
  }

  export async function initQuests(): Promise<void> {
    try {
      await readAllQuests(baseFolder);
      logger.startup("Initialized Quests.");
    } catch (error) {
      logger.error(`Error initializing quests: ${error}`);
    }
  }

  export async function isQuestUsed(quest: DailyQuestDef, accountId: string): Promise<boolean> {
    try {
      const storage = await questsService.findQuestByTemplateId(
        accountId,
        config.currentSeason,
        quest.Name,
      );

      const profile = await profilesService.findByAccountId(accountId);
      if (!profile) {
        return false;
      }

      const profileQuests = await handleProfileSelection("athena", accountId);
      if (!profileQuests || !profileQuests.items) {
        return false;
      }

      return !!storage;
    } catch (error) {
      logger.error(`Error checking if quest is used: ${error}`);
      return false;
    }
  }

  export async function getRandomQuest(accountId: string): Promise<DailyQuestDef | undefined> {
    const quests = Array.from(listedQuests[QuestType.REPEATABLE].values());

    if (quests.length === 0) {
      return;
    }

    const availableQuests = await Promise.all(
      quests.map(async (quest) => ({
        quest,
        isUsed: await isQuestUsed(quest, accountId),
      })),
    );

    const filteredQuests = availableQuests.filter(({ isUsed }) => !isUsed);

    if (filteredQuests.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredQuests.length);
    logger.debug(`Randomly selected quest index: ${randomIndex}`);
    return filteredQuests[randomIndex].quest;
  }

  export async function getBPQuests(): Promise<BattlepassQuestDef[]> {
    let allBPQuests: BattlepassQuestDef[] = [];

    const files = await fs.readdir(baseFolder);

    const fileReadPromises = files.map(async (file) => {
      const filePath = path.join(baseFolder, file);

      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        const subdirectoryBPQuests = await getBPQuests();
        allBPQuests = [...allBPQuests, ...subdirectoryBPQuests];
      } else if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const quest = JSON.parse(content) as BattlepassQuestDef;

          if (!listedBattlepassQuests.has(quest)) {
            listedBattlepassQuests.add(quest);
            allBPQuests.push(quest);
          }
        } catch (error) {
          logger.error(`Error parsing Quest ${file}: ${error}`);
        }
      }
    });

    await Promise.all(fileReadPromises);
    return allBPQuests;
  }

  export function buildBase(name: string, objectives: DailyQuestObjectives[]) {
    return {
      sent_new_notification: false,
      ObjectiveState: objectives.map((obj) => ({
        Name: `completion_${obj.BackendName}`,
        Value: 0,
      })),
      creation_time: new Date().toISOString(),
      level: -1,
      item_seen: false,
      playlists: [],
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
    };
  }
}
