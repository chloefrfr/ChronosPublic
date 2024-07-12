import path from "node:path";
import fs from "node:fs/promises";
import { itemStorageService, logger } from "../..";

interface DailyQuestDef {
  Type: string;
  Name: string;
  Class: string;
  Properties: DailyQuestProps;
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
  BATTLEPASS = "BATTLEPASS",
}

export const listedQuests: Record<QuestType, DailyQuestDef[]> = {
  [QuestType.REPEATABLE]: [],
  [QuestType.SEASONAL]: [],
  [QuestType.BATTLEPASS]: [],
};

const baseFolder = path.join(__dirname, "..", "..", "memory", "season", "quests");

export namespace QuestManager {
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
          const quest = JSON.parse(content) as DailyQuestDef;

          if (folder.includes("repeatable")) {
            listedQuests[QuestType.REPEATABLE].push(quest);
          } else if (folder.includes("seasonal")) {
            listedQuests[QuestType.SEASONAL].push(quest);
          } else if (folder.includes("battlepass")) {
            listedQuests[QuestType.BATTLEPASS].push(quest);
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

  export async function isQuestUsed(quest: DailyQuestDef): Promise<boolean> {
    try {
      const storage = await itemStorageService.getItemByType("daily_quest");
      if (!storage || typeof storage.data !== "object") return false;

      const questName = quest.Name;

      if (
        storage.data.hasOwnProperty(questName) &&
        Array.isArray(storage.data[questName]) &&
        storage.data[questName].length > 0
      )
        return true;

      return false;
    } catch (error) {
      return false;
    }
  }

  export async function getRandomQuest(): Promise<DailyQuestDef | undefined> {
    const quests = listedQuests[QuestType.REPEATABLE];

    if (!quests || quests.length === 0) return;

    const availableQuests = await Promise.all(
      quests.map(async (quest) => ({
        quest,
        isUsed: await isQuestUsed(quest),
      })),
    );

    const filteredQuests = availableQuests.filter(({ isUsed }) => !isUsed);

    if (filteredQuests.length === 0) return;

    const randomIndex = Math.floor(Math.random() * filteredQuests.length);
    return filteredQuests[randomIndex].quest;
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
