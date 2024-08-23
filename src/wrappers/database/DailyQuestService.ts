import type { DeleteResult, Repository, EntityManager, UpdateResult } from "typeorm";
import type Database from "../Database.wrapper";
import {
  DailyQuest,
  type Attributes,
  type DailyQuestData,
} from "../../tables/storage/other/dailyQuestStorage";
import { logger } from "../..";

export default class DailyQuestService {
  private dailyQuestRepository: Repository<DailyQuest>;

  constructor(private database: Database) {
    this.dailyQuestRepository = this.database.getRepository("daily_quest");
  }

  async add(accountId: string, data: DailyQuestData[]): Promise<void> {
    await this.dailyQuestRepository.manager.transaction(async (entityManager) => {
      let dailyQuest = await entityManager.findOne(DailyQuest, { where: { accountId } });

      if (!dailyQuest) {
        dailyQuest = new DailyQuest();
        dailyQuest.accountId = accountId;
        dailyQuest.data = data;
        await entityManager.save(dailyQuest);
      } else {
        dailyQuest.data.push(...data);
        await entityManager.update(DailyQuest, { accountId }, { data: dailyQuest.data });
      }
    });
  }

  async get(accountId: string): Promise<DailyQuestData[]> {
    const dailyQuest = await this.dailyQuestRepository.findOne({ where: { accountId } });
    return dailyQuest ? dailyQuest.data : [];
  }

  async getQuest(
    accountId: string,
    templateId: string,
  ): Promise<{
    templateId: string;
    attributes: Attributes;
    quantity: number;
  } | null> {
    try {
      const dailyQuestRecord = await this.dailyQuestRepository
        .createQueryBuilder("dailyQuest")
        .where("dailyQuest.accountId = :accountId", { accountId })
        .getOne();

      if (!dailyQuestRecord) {
        return null;
      }

      const questData: DailyQuestData[] = dailyQuestRecord.data;

      for (const quest of questData) {
        const questKey = Object.keys(quest)[0];
        const questValue = quest[questKey];

        if (questKey.includes(templateId)) {
          return questValue;
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error finding quest data: ${error}`);
      return null;
    }
  }

  async delete(accountId: string): Promise<DeleteResult> {
    return this.dailyQuestRepository.delete({ accountId });
  }

  async updateMultiple(accountId: string, newData: DailyQuestData[]): Promise<void> {
    await this.dailyQuestRepository.manager.transaction(async (entityManager) => {
      await entityManager.delete(DailyQuest, { accountId });

      const dailyQuest = new DailyQuest();
      dailyQuest.accountId = accountId;
      dailyQuest.data = newData;
      await entityManager.save(dailyQuest);
    });
  }

  async updateQuest(
    accountId: string,
    templateId: string,
    updatedQuest: {
      templateId: string;
      attributes: Attributes;
      quantity: number;
    },
  ): Promise<void | null> {
    try {
      await this.dailyQuestRepository.manager.transaction(async (entityManager) => {
        const dailyQuest = await entityManager.findOne(DailyQuest, { where: { accountId } });

        if (!dailyQuest) return null;

        const updatedData = dailyQuest.data.map((quest) => {
          const [key] = Object.keys(quest);
          return key === templateId ? { [templateId]: updatedQuest } : quest;
        });

        await entityManager
          .createQueryBuilder()
          .update(DailyQuest)
          .set({ data: updatedData })
          .where("accountId = :accountId", { accountId })
          .execute();
      });
    } catch (error) {
      logger.error(`Error updating quest data: ${error}`);
      return null;
    }
  }
}
