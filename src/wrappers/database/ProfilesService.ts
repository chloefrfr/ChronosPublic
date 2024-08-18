import { Repository } from "typeorm";
import { logger } from "../..";
import NodeCache from "node-cache";
import { Profiles } from "../../tables/profiles";
import type Database from "../Database.wrapper";
import type { IProfile } from "../../../types/profilesdefs";

enum ProfileType {
  Athena = "athena",
  CommonCore = "common_core",
  CommonPublic = "common_public",
  Campaign = "campaign",
  Metadata = "metadata",
  Theater0 = "theater0",
  Outpost0 = "outpost0",
  CollectionBookSchematics0 = "collection_book_schematics0",
  CollectionBookPeople0 = "collection_book_people0",
}

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
    data: Partial<IProfile>,
  ): Promise<Profiles | null> {
    try {
      let profile = await this.profilesRepository.findOne({ where: { accountId } });

      if (!profile) {
        profile = new Profiles();
        profile.accountId = accountId;
      }

      const profileData: IProfile = {
        profileId: type,
        ...data,
      } as IProfile;

      switch (type) {
        case ProfileType.Athena:
          profile.athena = profileData;
          break;
        case ProfileType.CommonCore:
          profile.common_core = profileData;
          break;
        case ProfileType.CommonPublic:
          profile.common_public = profileData;
          break;
        case ProfileType.Campaign:
          profile.campaign = profileData;
          break;
        case ProfileType.Metadata:
          profile.metadata = profileData;
          break;
        case ProfileType.Theater0:
          profile.theater0 = profileData;
          break;
        case ProfileType.CollectionBookSchematics0:
          profile.collection_book_schematics0 = profileData;
          break;
        case ProfileType.CollectionBookPeople0:
          profile.collection_book_people0 = profileData;
          break;
        case ProfileType.Outpost0:
          profile.outpost0 = profileData;
          break;
        default:
          logger.error(`Unknown profile type: ${type}`);
          break;
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
    data: Partial<unknown>,
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

  public async updateMultiple(
    updates: { accountId: string; type: keyof Profiles; data: Partial<unknown> }[],
  ): Promise<void> {
    if (updates.length === 0) return;

    try {
      const updateQueries = updates
        .map(
          (update, index) => `
        UPDATE "profiles"
        SET "${update.type}" = $${index * 2 + 1}
        WHERE "accountId" = $${index * 2 + 2};
      `,
        )
        .join(" ");

      const parameters = updates.flatMap((update) => [
        JSON.stringify(update.data),
        update.accountId,
      ]);

      await this.profilesRepository.query(updateQueries, parameters);
    } catch (error) {
      logger.error(`Error updating multiple profiles: ${error}`);
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
