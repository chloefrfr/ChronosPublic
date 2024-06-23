import type { Repository } from "typeorm";
import type Database from "../Database.wrapper";
import type { Profiles } from "../../tables/profiles";
import { logger } from "../..";

export default class ProfilesService {
  private profilesRepository: Repository<Profiles>;

  constructor(private database: Database) {
    this.profilesRepository = this.database.getRepository("profiles");
  }

  public async findByType(type: string): Promise<Profiles | null> {
    try {
      const profile = await this.profilesRepository
        .createQueryBuilder("profiles")
        .where("profiles.type = :type", { type })
        .getOne();

      return profile;
    } catch (error) {
      logger.error(`Error finding profile: ${error}`);
      return null;
    }
  }

  public async findByAccountId(accountId: string): Promise<Profiles | null> {
    try {
      const profile = await this.profilesRepository
        .createQueryBuilder("profiles")
        .where("profiles.accountId = :accountId", { accountId })
        .getOne();

      return profile;
    } catch (error) {
      logger.error(`Error finding profile: ${error}`);
      return null;
    }
  }

  public async create(profile: Partial<Profiles>): Promise<Profiles | null> {
    try {
      const newProfile = this.profilesRepository.create(profile);
      await this.profilesRepository.save(newProfile);
      return newProfile;
    } catch (error) {
      logger.error(`Error creating profile: ${error}`);
      return null;
    }
  }

  public async delete(accountId: string): Promise<boolean> {
    try {
      const result = await this.profilesRepository.delete({ accountId });
      if (result.affected === 1) return true;
      return false;
    } catch (error) {
      logger.error(`Error deleting profile: ${error}`);
      return false;
    }
  }
}
