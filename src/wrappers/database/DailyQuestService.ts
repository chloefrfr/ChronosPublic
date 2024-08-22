import type { DeleteResult, Repository, EntityManager, UpdateResult } from "typeorm";
import type Database from "../Database.wrapper";
import { DailyQuest, type DailyQuestData } from "../../tables/storage/other/dailyQuestStorage";

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

  async getQuest(accountId: string, templateId: string): Promise<DailyQuestData | null> {
    const dailyQuest = await this.dailyQuestRepository.findOne({ where: { accountId } });

    if (!dailyQuest) return null;

    return (
      dailyQuest.data.find((quest) => {
        return Object.values(quest)[0]?.templateId === templateId;
      }) || null
    );
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
    updatedQuest: DailyQuestData,
  ): Promise<void | null> {
    await this.dailyQuestRepository.manager.transaction(async (entityManager) => {
      const dailyQuest = await entityManager.findOne(DailyQuest, { where: { accountId } });

      if (!dailyQuest) return null;

      const updatedData = dailyQuest.data.map((quest) => {
        const questTemplateId = Object.values(quest)[0]?.templateId;
        return questTemplateId === templateId ? updatedQuest : quest;
      });

      await entityManager.update(DailyQuest, { accountId }, { data: updatedData });
    });
  }
}
