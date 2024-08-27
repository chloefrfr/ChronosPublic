import type { DeleteResult, Repository } from "typeorm";
import type Database from "../Database.wrapper";
import {
  BattlepassQuest,
  type BattlepassQuestData,
} from "../../tables/storage/other/battlepassQuestStorage";
import { WeeklyQuest } from "../../tables/storage/other/weeklyQuestStorage";

export default class WeeklyQuestService {
  private weeklyQuestRepository: Repository<WeeklyQuest>;

  constructor(private database: Database) {
    this.weeklyQuestRepository = this.database.getRepository("weekly_quest");
  }

  async add(accountId: string, season: number, data: BattlepassQuestData[]): Promise<void> {
    await this.weeklyQuestRepository.manager.transaction(async (entityManager) => {
      const existingQuest = await entityManager.findOne(WeeklyQuest, { where: { accountId } });

      if (!existingQuest) {
        await entityManager.insert(WeeklyQuest, {
          accountId,
          season,
          data,
        });
      } else {
        await entityManager.update(
          WeeklyQuest,
          { accountId, season },
          {
            data: [...existingQuest.data, ...data],
          },
        );
      }
    });
  }

  async get(
    accountId: string,
    season: number,
    templateId: string,
  ): Promise<BattlepassQuestData | null> {
    const bpQuest = await this.weeklyQuestRepository.findOne({ where: { accountId } });

    if (!bpQuest) return null;

    return (
      bpQuest.data.find((quest) => {
        return Object.values(quest)[0]?.templateId === templateId;
      }) || null
    );
  }

  async getAll(accountId: string, season: number): Promise<BattlepassQuestData[]> {
    const battlepassQuest = await this.weeklyQuestRepository.findOne({ where: { accountId } });
    return battlepassQuest?.data || [];
  }

  async delete(accountId: string): Promise<DeleteResult> {
    return this.weeklyQuestRepository.delete({ accountId });
  }

  async update(
    accountId: string,
    season: number,
    updatedQuest: BattlepassQuestData,
  ): Promise<void> {
    await this.weeklyQuestRepository.manager.transaction(async (entityManager) => {
      const battlepassQuest = await entityManager.findOne(WeeklyQuest, {
        where: { accountId, season },
      });

      if (battlepassQuest) {
        const updatedData = battlepassQuest.data.map((quest) =>
          quest.templateId === updatedQuest.templateId ? updatedQuest : quest,
        );
        await entityManager.update(WeeklyQuest, { accountId, season }, { data: updatedData });
      }
    });
  }

  async updateMultiple(
    accountId: string,
    season: number,
    newData: BattlepassQuestData[],
  ): Promise<void> {
    await this.weeklyQuestRepository.manager.transaction(async (entityManager) => {
      await entityManager.delete(WeeklyQuest, { accountId, season });

      await entityManager.insert(WeeklyQuest, {
        accountId,
        data: newData,
      });
    });
  }

  async deleteQuest(accountId: string, season: number, templateId: string): Promise<void> {
    await this.weeklyQuestRepository.manager.transaction(async (entityManager) => {
      const battlepassQuest = await entityManager.findOne(WeeklyQuest, {
        where: { accountId, season },
      });

      if (battlepassQuest) {
        const updatedData = battlepassQuest.data.filter((quest) =>
          quest.templateId.templateId.includes(templateId),
        );

        await entityManager.update(WeeklyQuest, { accountId, season }, { data: updatedData });
      }
    });
  }
}
