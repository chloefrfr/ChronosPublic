import { Repository } from "typeorm";
import { Quests } from "../../tables/quests";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export class QuestsService {
  private questsRepository: Repository<Quests>;

  constructor(private database: Database) {
    this.questsRepository = this.database.getRepository("quests");
  }

  async addQuest(data: {
    accountId: string;
    profileId: string;
    templateId: string;
    entity: object;
    isDaily: boolean;
    season: number;
  }): Promise<Quests> {
    const quest = this.questsRepository.create(data);

    return await this.questsRepository.save(quest);
  }

  async deleteQuestsByAccountId(accountId: string): Promise<void> {
    await this.questsRepository
      .createQueryBuilder()
      .delete()
      .from(Quests)
      .where("accountId = :accountId", { accountId })
      .execute();
  }

  async addQuests(
    quests: {
      accountId: string;
      profileId: string;
      templateId: string;
      entity: object;
      isDaily: boolean;
      season: number;
    }[],
  ): Promise<Quests[]> {
    const newQuests = this.questsRepository.create(quests);
    return await this.questsRepository.save(newQuests);
  }

  async deleteQuests(ids: number[]): Promise<void> {
    await this.questsRepository.delete(ids);
  }

  async findQuestByTemplateId(
    accountId: string,
    season: number,
    templateId: string,
  ): Promise<Quests | null> {
    return await this.questsRepository.findOneBy({ templateId, season, accountId });
  }

  async updateQuest(updateData: Partial<Quests>, accountId: string, season: number): Promise<void> {
    if (!updateData || !Object.keys(updateData).length) {
      throw new Error("No update data provided.");
    }

    try {
      await this.questsRepository.manager.transaction(async (transactionalEntityManager) => {
        const existingQuest = await transactionalEntityManager
          .createQueryBuilder(Quests, "quest")
          .where("quest.accountId = :accountId", { accountId })
          .andWhere("quest.season = :season", { season })
          .getOne();

        if (!existingQuest) {
          throw new Error(`No quest found for accountId: ${accountId} and season: ${season}`);
        }

        await transactionalEntityManager
          .createQueryBuilder()
          .update(Quests)
          .set(updateData)
          .where("accountId = :accountId", { accountId })
          .andWhere("season = :season", { season })
          .execute();
      });
    } catch (error) {
      logger.error(`Failed to update quest: ${error}`);
      throw new Error(`Failed to update quest: ${error}`);
    }
  }

  async findAllQuests(take: number = 10, skip: number = 0): Promise<Quests[]> {
    return await this.questsRepository.find({ take, skip });
  }

  async findAllQuestsByAccountId(accountId: string): Promise<Quests[]> {
    return await this.questsRepository.find({ where: { accountId } });
  }
}
