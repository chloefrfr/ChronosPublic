import type { Repository } from "typeorm";
import { Hype } from "../../tables/hype";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export default class HypeService {
  private hypeRepository: Repository<Hype>;

  constructor(private database: Database) {
    this.hypeRepository = this.database.getRepository("hype");
  }

  public async create() {
    const divisions = [{ name: "ARENA_S13_Division1", min: 0, max: 400 }];

    const hypeEntities = divisions.map(({ name, min, max }, index) => ({
      name,
      minimum_required_hype: min,
      division: index + 1,
      maximum_required_hype: max.toString(),
    }));

    const existingEntities = await this.hypeRepository.find();
    if (existingEntities.length === 0) await this.hypeRepository.save(hypeEntities);
  }

  public async getAll(): Promise<Hype[]> {
    try {
      const allHypes = await this.hypeRepository.find();
      return allHypes;
    } catch (error) {
      void logger.error(`Failed to getAll:${error}`);
      throw error;
    }
  }

  public async update(newData: Partial<Hype[]>) {
    const allExistingTokens = await this.hypeRepository.find();

    allExistingTokens.forEach((token) => {
      const newDataItem = newData.find((item) => item !== undefined && item.name === token.name);
      if (newDataItem) {
        token.minimum_required_hype = newDataItem.minimum_required_hype;
        token.division = newDataItem.division;
        token.maximum_required_hype = newDataItem.maximum_required_hype;
      }
    });

    await this.hypeRepository.save(allExistingTokens);
  }
}
