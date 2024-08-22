import { EntityManager, In, Repository, type QueryRunner } from "typeorm";
import { logger } from "../..";
import { LRUCache } from "lru-cache";
import { Profiles } from "../../tables/profiles";
import type Database from "../Database.wrapper";
import { ProfileType, type IProfile } from "../../../types/profilesdefs";
import asyncPool from "tiny-async-pool";

// Calculates the batch size based on the estimated data size.
// This is the only way I know how to do something like this.
// There's probably a better way, but this gets the job done.
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
      ttl: 300 * 1000,
    });
  }

  public async findByName(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<Profiles | null> {
    const queryRunner: QueryRunner = this.profilesRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.startTransaction("READ COMMITTED");

      const profile = await queryRunner.query(
        `SELECT "id", "accountId", "${profileName}" 
       FROM profiles 
       WHERE "accountId" = $1 LIMIT 1`,
        [accountId],
      );

      await queryRunner.commitTransaction();
      return profile.length ? profile[0] : null;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error(
        `Error finding profile by accountId ${accountId} and profileName ${profileName}: ${error}`,
      );
      return null;
    } finally {
      await queryRunner.release();
    }
  }

  public async findProfilesByAccountIds(
    accountIds: string[],
  ): Promise<Map<string, Profiles | null>> {
    const results = new Map<string, Profiles | null>();

    const cacheKeys = new Set(accountIds.map((id) => `profile_accountId_${id}`));
    const cachedProfiles = Array.from(cacheKeys).reduce((acc, key) => {
      const cachedProfile = this.cache.get(key);
      if (cachedProfile) {
        acc.push({ id: key.replace("profile_accountId_", ""), profile: cachedProfile });
      }
      return acc;
    }, [] as { id: string; profile: Profiles }[]);

    cachedProfiles.forEach(({ id, profile }) => {
      results.set(id, profile);
    });

    const accountIdsToFetch = accountIds.filter((id) => !results.has(id));

    if (accountIdsToFetch.length > 0) {
      try {
        await this.profilesRepository.manager.transaction(async (manager: EntityManager) => {
          await manager.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");

          const profiles = await manager.find(Profiles, {
            where: { accountId: In(accountIdsToFetch) },
          });

          profiles.forEach((profile) => {
            const key = `profile_accountId_${profile.accountId}`;
            this.cache.set(key, profile);
            results.set(profile.accountId, profile);
          });

          accountIdsToFetch.forEach((id) => {
            if (!results.has(id)) {
              results.set(id, null);
            }
          });
        });
      } catch (error) {
        logger.error(
          `Error finding profiles by accountIds ${accountIdsToFetch.join(", ")}: ${error}`,
        );
        accountIdsToFetch.forEach((id) => results.set(id, null));
      }
    }

    return results;
  }

  public async findByAccountId(accountId: string): Promise<Profiles | null> {
    try {
      const batchResults = await this.findProfilesByAccountIds([accountId]);
      return batchResults.get(accountId) || null;
    } catch (error) {
      logger.error(`Error finding profile by accountId ${accountId}: ${error}`);
      return null;
    }
  }

  public async createOrUpdate(
    accountId: string,
    type: keyof Omit<Profiles, "id" | "accountId">,
    data: Partial<IProfile>,
  ): Promise<Profiles | null> {
    const queryRunner: QueryRunner = this.profilesRepository.manager.connection.createQueryRunner();

    try {
      await queryRunner.startTransaction("READ COMMITTED");

      let profile = await queryRunner.query(
        `SELECT * FROM profiles WHERE "accountId" = $1 LIMIT 1`,
        [accountId],
      );

      if (profile.length === 0) {
        await queryRunner.query(
          `INSERT INTO profiles ("accountId", "${type}") VALUES ($1, $2) RETURNING *`,
          [accountId, { profileId: type, ...data }],
        );
      } else {
        profile = profile[0];

        await queryRunner.query(`UPDATE profiles SET "${type}" = $2 WHERE "accountId" = $1`, [
          accountId,
          { profileId: type, ...data },
        ]);
      }

      await queryRunner.commitTransaction();

      this.cache.set(`profile_accountId_${accountId}`, profile);

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
        const updatedProfile = await this.profilesRepository.findOne({ where: { accountId } });
        if (updatedProfile) this.cache.set(`profile_accountId_${accountId}`, updatedProfile);
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
      });

      await queryRunner.commitTransaction();
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
        this.cache.delete(`profile_accountId_${accountId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting profile by accountId ${accountId}: ${error}`);
      return false;
    }
  }
}
