import type { Repository } from "typeorm";
import { Hype } from "../../tables/hype";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export default class HypeService {
  private hypeRepository: Repository<Hype>;

  constructor(private database: Database) {
    this.hypeRepository = this.database.getRepository("hype");
  }

  public async create(season: number) {
    const divisions = [
      { name: `ARENA_S${season}_Division1`, min: 0, max: 399 },
      { name: `ARENA_S${season}_Division2`, min: 400, max: 799 },
      { name: `ARENA_S${season}_Division3`, min: 800, max: 1199 },
      { name: `ARENA_S${season}_Division4`, min: 1200, max: 1999 },
      { name: `ARENA_S${season}_Division5`, min: 2000, max: 2999 },
      { name: `ARENA_S${season}_Division6`, min: 3000, max: 4999 },
      { name: `ARENA_S${season}_Division7`, min: 5000, max: 7499 },
      { name: `ARENA_S${season}_Division8`, min: 7500, max: 9999 },
      { name: `ARENA_S${season}_Division9`, min: 10000, max: 14999 },
      { name: `ARENA_S${season}_Division10`, min: 15000, max: "9007199254740991" },
    ];

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
