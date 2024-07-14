import path from "node:path";
import fs from "node:fs/promises";
import { dailyQuestService, itemStorageService, logger } from "../..";

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

const baseFolder = path.join(__dirname, "..", "..", "memory", "season", "quests");

export namespace QuestManager {
  export const listedQuests: Record<QuestType, DailyQuestDef[]> = {
    [QuestType.REPEATABLE]: [],
    [QuestType.SEASONAL]: [],
    [QuestType.BATTLEPASS]: [],
    [QuestType.WEEKLY]: [],
  };

  export const listedBattlepassQuests: Partial<BattlepassQuestDef[]> = [];
  export const listedWeeklyQuests: Partial<BattlepassQuestDef[]> = [];

  async function readAllQuests(folder: string): Promise<DailyQuestDef[]> {
    let allQuests: DailyQuestDef[] = [];

    const files = await fs.readdir(folder);

    for (const file of files) {
      const filePath = path.join(folder, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        const subdirectoryQuests = await readAllQuests(filePath);
        allQuests = [...allQuests, ...subdirectoryQuests];
      } else if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const quest = JSON.parse(content);

          if (folder.includes("repeatable")) {
            listedQuests[QuestType.REPEATABLE].push(quest);
          } else if (folder.includes("seasonal")) {
            listedQuests[QuestType.SEASONAL].push(quest);
          } else if (folder.includes("battlepass")) {
            listedQuests[QuestType.BATTLEPASS].push(quest);
            listedBattlepassQuests.push(quest as BattlepassQuestDef);
          } else if (folder.includes("weekly")) {
            listedQuests[QuestType.WEEKLY].push(quest);
            listedWeeklyQuests.push(quest as BattlepassQuestDef);
          }

          allQuests.push(quest);
        } catch (error) {
          logger.error(`Error parsing Quest ${filePath}: ${error}`);
        }
      }
    }

    return allQuests;
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
      const storage = await dailyQuestService.getQuest(accountId, quest.Name);
      if (!storage) return false;

      if (storage) return true;

      return false;
    } catch (error) {
      return false;
    }
  }

  export async function getRandomQuest(accountId: string): Promise<DailyQuestDef | undefined> {
    const quests = listedQuests[QuestType.REPEATABLE];

    if (!quests || quests.length === 0) return;

    const availableQuests = await Promise.all(
      quests.map(async (quest) => ({
        quest,
        isUsed: await isQuestUsed(quest, accountId),
      })),
    );

    const filteredQuests = availableQuests.filter(({ isUsed }) => !isUsed);

    if (filteredQuests.length === 0) return;

    const randomIndex = Math.floor(Math.random() * filteredQuests.length);
    return filteredQuests[randomIndex].quest;
  }

  export async function getBPQuests(): Promise<BattlepassQuestDef[]> {
    let allBPQuests: BattlepassQuestDef[] = [];

    const files = await fs.readdir(baseFolder);

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(baseFolder, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          const subdirectoryQuests = await getBPQuests();
          allBPQuests = [...allBPQuests, ...subdirectoryQuests];
        } else if (file.endsWith(".json")) {
          try {
            const content = await fs.readFile(filePath, "utf-8");
            const quest = JSON.parse(content) as BattlepassQuestDef;

            if (baseFolder.includes("battlepass")) {
              listedBattlepassQuests.push(quest);
            }

            allBPQuests.push(quest);
          } catch (error) {
            logger.error(`Error parsing Quest ${filePath}: ${error}`);
          }
        }
      }),
    );

    return allBPQuests;
  }

  export function buildBase(name: string, objectives: DailyQuestObjectives[]) {
    return {
      templateId: `Quest:${name}`,
      attributes: {
        sent_new_notification: false,
        ObjectiveState: objectives.map((obj) => ({
          Name: `completion_${obj.BackendName}`,
          Value: 0,
        })),
      },
      quantity: 1,
    };
  }
}
