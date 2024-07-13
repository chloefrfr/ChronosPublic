import type { DeleteResult, Repository } from "typeorm";
import type Database from "../Database.wrapper";
import { logger } from "../..";
import { DailyQuest, type DailyQuestData } from "../../tables/storage/other/dailyQuestStorage";

export default class DailyQuestService {
  private dailyQuestRepository: Repository<DailyQuest>;

  constructor(private database: Database) {
    this.dailyQuestRepository = this.database.getRepository("daily_quest");
  }

  async add(accountId: string, data: DailyQuestData[]): Promise<void> {
    let dailyQuest = await this.dailyQuestRepository.findOne({ where: { accountId } });

    if (!dailyQuest) {
      dailyQuest = new DailyQuest();
      dailyQuest.accountId = accountId;
      dailyQuest.data = data;
    } else {
      dailyQuest.data = [...dailyQuest.data, ...data];
    }

    await this.dailyQuestRepository.save(dailyQuest);
  }

  async get(accountId: string): Promise<DailyQuestData[]> {
    const query = this.dailyQuestRepository
      .createQueryBuilder("daily_quest")
      .where("daily_quest.accountId = :accountId", { accountId });

    const result = await query.getOne();
    return result ? result.data : [];
  }

  async getQuest(accountId: string, templateId: string): Promise<DailyQuestData | null> {
    const dailyQuest = await this.dailyQuestRepository.findOne({
      where: { accountId },
    });

    if (!dailyQuest) {
      return null;
    }

    const questData = dailyQuest.data.find((quest) => {
      const questTemplateId = Object.values(quest)[0]?.templateId;
      return questTemplateId === templateId;
    });

    return questData || null;
  }

  async delete(accountId: string): Promise<DeleteResult> {
    const result = await this.dailyQuestRepository.delete({ accountId });
    return result;
  }

  async updateMultiple(accountId: string, newData: DailyQuestData[]): Promise<void> {
    const entityManager = this.dailyQuestRepository.manager;
    await entityManager.transaction(async (entityManager) => {
      await entityManager.delete(DailyQuest, { accountId });
      const dailyQuest = new DailyQuest();
      dailyQuest.accountId = accountId;
      dailyQuest.data = newData;
      await entityManager.save(dailyQuest);
    });
  }
}
