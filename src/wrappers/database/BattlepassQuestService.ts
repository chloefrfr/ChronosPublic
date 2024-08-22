import type { DeleteResult, Repository, EntityManager } from "typeorm";
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
      let battlepassQuest = await entityManager.findOne(BattlepassQuest, { where: { accountId } });

      if (!battlepassQuest) {
        battlepassQuest = new BattlepassQuest();
        battlepassQuest.accountId = accountId;
        battlepassQuest.data = data;
        await entityManager.save(battlepassQuest);
      } else {
        battlepassQuest.data.push(...data);
        await entityManager.update(BattlepassQuest, { accountId }, { data: battlepassQuest.data });
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

  async delete(accountId: string): Promise<DeleteResult> {
    return this.battlepassQuestRepository.delete({ accountId });
  }

  async updateMultiple(accountId: string, newData: BattlepassQuestData[]): Promise<void> {
    await this.battlepassQuestRepository.manager.transaction(async (entityManager) => {
      await entityManager.delete(BattlepassQuest, { accountId });

      const battlepassQuest = new BattlepassQuest();
      battlepassQuest.accountId = accountId;
      battlepassQuest.data = newData;
      await entityManager.save(battlepassQuest);
    });
  }
}
