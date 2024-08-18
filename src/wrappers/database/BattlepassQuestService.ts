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
    let battlepassQuest = await this.battlepassQuestRepository.findOne({ where: { accountId } });

    if (!battlepassQuest) {
      battlepassQuest = new BattlepassQuest();
      battlepassQuest.accountId = accountId;
      battlepassQuest.data = data;
    } else {
      battlepassQuest.data = [...battlepassQuest.data, ...data];
    }

    await this.battlepassQuestRepository.save(battlepassQuest);
  }

  async get(accountId: string, templateId: string): Promise<BattlepassQuestData | null> {
    const bpQuest = await this.battlepassQuestRepository.findOne({
      where: { accountId },
    });

    if (!bpQuest) {
      return null;
    }

    const questData = bpQuest.data.find((quest) => {
      const questTemplateId = Object.values(quest)[0]?.templateId;
      return questTemplateId === templateId;
    });

    return questData || null;
  }

  async delete(accountId: string): Promise<DeleteResult> {
    const result = await this.battlepassQuestRepository.delete({ accountId });
    return result;
  }

  async updateMultiple(accountId: string, newData: BattlepassQuestData[]): Promise<void> {
    const entityManager = this.battlepassQuestRepository.manager;
    await entityManager.transaction(async (entityManager) => {
      await entityManager.delete(BattlepassQuest, { accountId });
      const dailyQuest = new BattlepassQuest();
      dailyQuest.accountId = accountId;
      dailyQuest.data = newData;
      await entityManager.save(dailyQuest);
    });
  }
}
