import { Repository } from "typeorm";
import Database from "../Database.wrapper";
import { logger } from "../..";
import { Profiles } from "../../tables/profiles";
import NodeCache from "node-cache";

export default class ProfilesService {
  private profilesRepository: Repository<Profiles>;
  private cache: NodeCache;

  constructor(private database: Database) {
    this.profilesRepository = this.database.getRepository("profiles");
    this.cache = new NodeCache();
  }

  private getRandomTTL(): number {
    return Math.floor(Math.random() * (300 - 60 + 1)) + 60;
  }

  public async findByType(type: string): Promise<Profiles | null> {
    try {
      const cachedProfile = this.cache.get<Profiles>(`profile_type_${type}`);
      if (cachedProfile) {
        return cachedProfile;
      } else {
        const profile = await this.profilesRepository
          .createQueryBuilder("profiles")
          .where("profiles.type = :type", { type })
          .getOne();

        if (profile) {
          const ttl = this.getRandomTTL();
          this.cache.set(`profile_type_${type}`, profile, ttl);
        }

        return profile || null;
      }
    } catch (error) {
      logger.error(`Error finding profile by type: ${error}`);
      return null;
    }
  }

  public async findByAccountId(accountId: string): Promise<Profiles | null> {
    try {
      const cachedProfile = this.cache.get<Profiles>(`profile_accountId_${accountId}`);
      if (cachedProfile) {
        return cachedProfile;
      } else {
        const profile = await this.profilesRepository
          .createQueryBuilder("profiles")
          .where("profiles.accountId = :accountId", { accountId })
          .getOne();

        if (profile) {
          const ttl = this.getRandomTTL();
          this.cache.set(`profile_accountId_${accountId}`, profile, ttl);
        }

        return profile || null;
      }
    } catch (error) {
      logger.error(`Error finding profile by accountId: ${error}`);
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
      return result.affected === 1;
    } catch (error) {
      logger.error(`Error deleting profile: ${error}`);
      return false;
    }
  }
}
