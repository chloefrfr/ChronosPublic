import { EntityManager, In, Repository, type QueryRunner } from "typeorm";
import { logger } from "../..";
import { LRUCache } from "lru-cache";
import { Profiles } from "../../tables/profiles";
import type Database from "../Database.wrapper";
import asyncPool from "tiny-async-pool";

function getOptimalBatchSize(
  updates: { accountId: string; type: keyof Profiles; data: Partial<unknown> }[],
  targetBatchSizeInBytes = 1_000_000,
  minBatchSize = 100,
  maxBatchSize = 5_000,
): number {
  if (updates.length === 0) return 0;

  const estimatedSizes = updates.map((update) => Buffer.byteLength(JSON.stringify(update)));
  const averageSize = estimatedSizes.reduce((sum, size) => sum + size, 0) / updates.length;
  const calculatedBatchSize = Math.floor(targetBatchSizeInBytes / averageSize);
  return Math.max(minBatchSize, Math.min(calculatedBatchSize, maxBatchSize));
}

export default class ProfilesService {
  private profilesRepository: Repository<Profiles>;
  private cache: LRUCache<string, Profiles>;

  constructor(private database: Database) {
    this.profilesRepository = database.getRepository(Profiles);
    this.cache = new LRUCache<string, Profiles>({
      max: 1000,
    });
  }

  private generateCacheKey(accountId: string): string {
    return `profile_accountId_${accountId}`;
  }

  public async findByName(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<Profiles | null> {
    try {
      const profile = await this.profilesRepository
        .createQueryBuilder("profiles")
        .select(["profiles.id", "profiles.accountId", `profiles.${profileName}`])
        .where("profiles.accountId = :accountId", { accountId })
        .getOne();

      return profile;
    } catch (error) {
      logger.error(
        `Error finding profile by accountId ${accountId} and profileName ${profileName}: ${error}`,
      );
      return null;
    }
  }

  public async findProfilesByAccountIds(
    accountIds: string[],
  ): Promise<Map<string, Profiles | null>> {
    const results = new Map<string, Profiles | null>();

    const cacheKeys = accountIds.map(this.generateCacheKey.bind(this));
    const cachedProfiles = cacheKeys
      .map((key, index) => ({ key, profile: this.cache.get(key), accountId: accountIds[index] }))
      .filter((entry) => entry.profile);

    cachedProfiles.forEach(({ accountId, profile }) => {
      if (profile) results.set(accountId, profile);
    });

    const accountIdsToFetch = accountIds.filter((id) => !results.has(id));
    if (accountIdsToFetch.length === 0) return results;

    try {
      await this.profilesRepository.manager.transaction(async (manager: EntityManager) => {
        await manager.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");

        const profiles = await manager.find(Profiles, {
          select: ["id", "accountId", "athena", "common_core", "common_public"],
          where: { accountId: In(accountIdsToFetch) },
        });

        profiles.forEach((profile) => {
          const key = this.generateCacheKey(profile.accountId);
          this.cache.set(key, profile);
          results.set(profile.accountId, profile);
        });

        accountIdsToFetch.forEach((id) => {
          if (!results.has(id)) results.set(id, null);
        });
      });
    } catch (error) {
      logger.error(
        `Error finding profiles by accountIds ${accountIdsToFetch.join(", ")}: ${error}`,
      );
      accountIdsToFetch.forEach((id) => results.set(id, null));
    }

    return results;
  }

  public async findByAccountId(accountId: string): Promise<Profiles | null> {
    try {
      const results = await this.findProfilesByAccountIds([accountId]);
      return results.get(accountId) || null;
    } catch (error) {
      logger.error(`Error finding profile by accountId ${accountId}: ${error}`);
      return null;
    }
  }

  public async createOrUpdate(
    accountId: string,
    type: keyof Omit<Profiles, "id" | "accountId">,
    data: Partial<unknown>,
  ): Promise<Profiles | null> {
    const queryRunner = this.profilesRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction("READ COMMITTED");

    try {
      const existingProfile = await queryRunner.query(
        `SELECT * FROM profiles WHERE "accountId" = $1 LIMIT 1`,
        [accountId],
      );

      let profile;
      if (existingProfile.length === 0) {
        profile = await queryRunner.query(
          `INSERT INTO profiles ("accountId", "${type}") VALUES ($1, $2) RETURNING *`,
          [accountId, JSON.stringify(data)],
        );
      } else {
        profile = await queryRunner.query(
          `UPDATE profiles SET "${type}" = $2 WHERE "accountId" = $1 RETURNING *`,
          [accountId, JSON.stringify(data)],
        );
      }

      await queryRunner.commitTransaction();

      profile = profile[0];
      this.cache.set(this.generateCacheKey(accountId), profile);

      return profile;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Error creating or updating profile: ${error}`);
      return null;
    } finally {
      await queryRunner.release();
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
        .set({ [type]: data })
        .where("accountId = :accountId", { accountId })
        .returning("*")
        .execute();

      if (result.affected && result.affected > 0) {
        const updatedProfile = result.raw[0];
        this.cache.set(this.generateCacheKey(accountId), updatedProfile);
        return updatedProfile;
      }

      return null;
    } catch (error) {
      logger.error(`Error updating profile ${accountId}: ${error}`);
      return null;
    }
  }

  public async updateMultiple(
    updates: { accountId: string; type: keyof Profiles; data: Partial<unknown> }[],
  ): Promise<void> {
    if (updates.length === 0) return;

    const batchSize = getOptimalBatchSize(updates);
    const concurrencyLimit = 4;
    const updatedProfiles = new Map<string, Partial<Profiles>>();

    const queryRunner = this.profilesRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const batches = [];
      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
      }

      await asyncPool(concurrencyLimit, batches, async (batch) => {
        const updateQuery = `
          UPDATE "profiles"
          SET "${batch[0].type}" = data_table.data
          FROM (VALUES
            ${batch.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2}::jsonb)`).join(",\n")}
          ) AS data_table(account_id, data)
          WHERE "profiles"."accountId" = data_table.account_id;
        `;

        const parameters = batch.flatMap((update) => [
          update.accountId,
          JSON.stringify(update.data),
        ]);

        await queryRunner.query(updateQuery, parameters);

        batch.forEach((update) => {
          updatedProfiles.set(update.accountId, update.data);
        });
      });

      await queryRunner.commitTransaction();

      updatedProfiles.forEach((data, accountId) => {
        const key = this.generateCacheKey(accountId);
        const cachedProfile = this.cache.get(key);
        if (cachedProfile) {
          const updateType = updates.find((u) => u.accountId === accountId)?.type;

          if (updateType) {
            const updatedProfile = {
              ...cachedProfile,
              [updateType]: data,
            } as Profiles;

            this.cache.set(key, updatedProfile);
          }
        }
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(`Error updating multiple profiles: ${error}`);
    } finally {
      await queryRunner.release();
    }
  }

  public async deleteByAccountId(accountId: string): Promise<boolean> {
    try {
      const result = await this.profilesRepository.delete({ accountId });
      if (result.affected && result.affected > 0) {
        this.cache.delete(this.generateCacheKey(accountId));
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting profile by accountId ${accountId}: ${error}`);
      return false;
    }
  }
}
