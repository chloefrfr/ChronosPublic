import type { DeleteResult, Repository } from "typeorm";
import type Database from "../Database.wrapper";
import {
  BattlepassQuest,
  type BattlepassQuestData,
} from "../../tables/storage/other/battlepassQuestStorage";

export default class BattlepassQuestService {
  private battlepassQuestRepository: Repository<BattlepassQuest>;

  constructor(private database: Database) {
    this.battlepassQuestRepository = this.database.getRepository("battlepass_quest");
  }

  async add(accountId: string, data: BattlepassQuestData[]): Promise<void> {
    await this.battlepassQuestRepository.manager.transaction(async (entityManager) => {
      const existingQuest = await entityManager.findOne(BattlepassQuest, { where: { accountId } });

      if (!existingQuest) {
        await entityManager.insert(BattlepassQuest, {
          accountId,
          data,
        });
      } else {
        await entityManager.update(
          BattlepassQuest,
          { accountId },
          {
            data: [...existingQuest.data, ...data],
          },
        );
      }
    });
  }

  async get(accountId: string, templateId: string): Promise<BattlepassQuestData | null> {
    const bpQuest = await this.battlepassQuestRepository.findOne({ where: { accountId } });

    if (!bpQuest) return null;

    return (
      bpQuest.data.find((quest) => {
        return Object.values(quest)[0]?.templateId === templateId;
      }) || null
    );
  }

  async getAll(accountId: string): Promise<BattlepassQuestData[]> {
    const battlepassQuest = await this.battlepassQuestRepository.findOne({ where: { accountId } });
    return battlepassQuest?.data || [];
  }

  async delete(accountId: string): Promise<DeleteResult> {
    return this.battlepassQuestRepository.delete({ accountId });
  }

  async update(accountId: string, updatedQuest: BattlepassQuestData): Promise<void> {
    await this.battlepassQuestRepository.manager.transaction(async (entityManager) => {
      const battlepassQuest = await entityManager.findOne(BattlepassQuest, {
        where: { accountId },
      });

      if (battlepassQuest) {
        const updatedData = battlepassQuest.data.map((quest) =>
          quest.templateId === updatedQuest.templateId ? updatedQuest : quest,
        );
        await entityManager.update(BattlepassQuest, { accountId }, { data: updatedData });
      }
    });
  }

  async updateMultiple(accountId: string, newData: BattlepassQuestData[]): Promise<void> {
    await this.battlepassQuestRepository.manager.transaction(async (entityManager) => {
      await entityManager.delete(BattlepassQuest, { accountId });

      await entityManager.insert(BattlepassQuest, {
        accountId,
        data: newData,
      });
    });
  }
}
