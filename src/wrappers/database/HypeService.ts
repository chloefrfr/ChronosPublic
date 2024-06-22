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
    const divisions = [
      { name: "ARENA_S13_Division1", min: 0, max: 250 },
      { name: "ARENA_S13_Division2", min: 250, max: 500 },
      { name: "ARENA_S13_Division3", min: 500, max: 1000 },
      { name: "ARENA_S13_Division4", min: 1000, max: 1500 },
      { name: "ARENA_S13_Division5", min: 1500, max: 2500 },
      { name: "ARENA_S13_Division6", min: 2500, max: 4000 },
      { name: "ARENA_S13_Division7", min: 4000, max: 6000 },
      { name: "ARENA_S13_Division8", min: 6000, max: 12000 },
      { name: "ARENA_S13_Division9", min: 12000, max: 16000 },
      { name: "ARENA_S13_Division10", min: 16000, max: "9007199254740991" },
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
