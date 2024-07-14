import { Repository } from "typeorm";
import { logger } from "../..";
import NodeCache from "node-cache";
import { Profiles } from "../../tables/profiles";
import type Database from "../Database.wrapper";
import type { Athena, CommonCore, CommonPublic } from "../../../types/profilesdefs";

export default class ProfilesService {
  private profilesRepository: Repository<Profiles>;
  private cache: NodeCache;

  constructor(private database: Database) {
    this.profilesRepository = database.getRepository("profiles");
    this.cache = new NodeCache();
  }

  private getRandomTTL(): number {
    return Math.floor(Math.random() * (300 - 60 + 1)) + 60;
  }

  public async findByName(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<Profiles | null> {
    try {
      const profile = await this.profilesRepository.findOne({ where: { accountId } });
      return profile || null;
    } catch (error) {
      logger.error(
        `Error finding profile by accountId ${accountId} and profileName ${profileName}: ${error}`,
      );
      return null;
    }
  }

  public async findByAccountId(accountId: string): Promise<Profiles | null> {
    try {
      const cachedProfile = this.cache.get<Profiles>(`profile_accountId_${accountId}`);
      if (cachedProfile) {
        return cachedProfile;
      }

      const profile = await this.profilesRepository.findOne({ where: { accountId } });

      if (profile) {
        const ttl = this.getRandomTTL();
        this.cache.set(`profile_accountId_${accountId}`, profile, ttl);
      }

      return profile || null;
    } catch (error) {
      logger.error(`Error finding profile by accountId: ${error}`);
      return null;
    }
  }

  public async createOrUpdate(
    accountId: string,
    type: keyof Profiles,
    data: Partial<Athena | CommonCore | CommonPublic>,
  ): Promise<Profiles | null> {
    try {
      let profile = await this.profilesRepository.findOne({ where: { accountId } });

      if (!profile) {
        profile = new Profiles();
        profile.accountId = accountId;
      }

      switch (type) {
        case "athena":
          profile.athena = { ...(profile.athena || {}), ...(data as Athena) };
          break;
        case "common_core":
          profile.common_core = { ...(profile.common_core || {}), ...(data as CommonCore) };
          break;
        case "common_public":
          profile.common_public = { ...(profile.common_public || {}), ...(data as CommonPublic) };
          break;
        default:
          throw new Error(`Invalid profile type: ${type}`);
      }

      await this.profilesRepository.save(profile);
      const ttl = this.getRandomTTL();
      this.cache.set(`profile_accountId_${accountId}`, profile, ttl);
      return profile;
    } catch (error) {
      logger.error(`Error creating or updating profile: ${error}`);
      return null;
    }
  }

  public async update(
    accountId: string,
    type: keyof Profiles,
    data: Partial<Athena | CommonCore | CommonPublic>,
  ): Promise<Profiles | null> {
    try {
      const result = await this.profilesRepository
        .createQueryBuilder()
        .update(Profiles)
        .set({
          [type]: { ...data },
        })
        .where("accountId = :accountId", { accountId })
        .returning("*")
        .execute();

      if (result.affected && result.affected > 0) {
        const updatedProfile = await this.profilesRepository.findOne({ where: { accountId } });
        if (updatedProfile) {
          const ttl = this.getRandomTTL();
          this.cache.set(`profile_accountId_${accountId}`, updatedProfile, ttl);
        }
        return updatedProfile || null;
      }

      return null;
    } catch (error) {
      logger.error(`Error updating profile: ${error}`);
      return null;
    }
  }

  public async deleteByAccountId(accountId: string): Promise<boolean> {
    try {
      const result = await this.profilesRepository.delete({ accountId });
      if (result.affected && result.affected > 0) {
        this.cache.del(`profile_accountId_${accountId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting profile by accountId: ${error}`);
      return false;
    }
  }
}
