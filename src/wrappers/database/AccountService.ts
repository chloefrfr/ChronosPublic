import { Repository } from "typeorm";
import Database from "../Database.wrapper";
import { logger } from "../..";
import { Account } from "../../tables/account";
import NodeCache from "node-cache";
import type { Abilities } from "../../../types/permissionsdefs";

export default class AccountService {
  private accountRepository: Repository<Account>;
  private cache: NodeCache;
  private static actionCounter = 0;

  constructor(private database: Database) {
    this.accountRepository = this.database.getRepository("account");
    this.cache = new NodeCache();
  }

  private getRandomTTL(): number {
    return Math.floor(Math.random() * (300 - 60 + 1)) + 60;
  }

  private generateAction(): number {
    return ++AccountService.actionCounter;
  }

  public async findUserByAccountId(accountId: string): Promise<Account | null> {
    try {
      const cachedAccount = this.cache.get<Account>(`account_${accountId}`);
      if (cachedAccount) {
        return cachedAccount;
      } else {
        const account = await this.accountRepository
          .createQueryBuilder("account")
          .where("account.accountId = :accountId", { accountId })
          .getOne();

        if (account) {
          const ttl = this.getRandomTTL();
          this.cache.set(`account_${accountId}`, account, ttl);
        }

        return account || null;
      }
    } catch (error) {
      logger.error(`Error finding account: ${error}`);
      return null;
    }
  }

  public async findUserByDiscordId(discordId: string): Promise<Account | null> {
    try {
      const cachedAccount = this.cache.get<Account>(`account_discord_${discordId}`);
      if (cachedAccount) {
        return cachedAccount;
      } else {
        const account = await this.accountRepository
          .createQueryBuilder("account")
          .where("account.discordId = :discordId", { discordId })
          .getOne();

        if (account) {
          const ttl = this.getRandomTTL();
          this.cache.set(`account_discord_${discordId}`, account, ttl);
        }

        return account || null;
      }
    } catch (error) {
      logger.error(`Error finding account: ${error}`);
      return null;
    }
  }

  public async create(account: Partial<Account>): Promise<Account | null> {
    try {
      const newAccount = this.accountRepository.create(account);
      await this.accountRepository.save(newAccount);
      return newAccount;
    } catch (error) {
      logger.error(`Error creating account: ${error}`);
      return null;
    }
  }

  // public async addPermission(
  //   accountId: string,
  //   permission: string,
  //   abilities: Abilities,
  // ): Promise<Account | null> {
  //   const permissionExists = await this.accountRepository
  //     .createQueryBuilder("account")
  //     .where("account.accountId = :accountId", { accountId })
  //     .andWhere("account.permissions @> :permission", {
  //       permission: JSON.stringify([{ resource: permission, abilities }]),
  //     })
  //     .getCount();

  //   if (permissionExists > 0) return null;

  //   const account = await this.accountRepository.findOne({
  //     where: { accountId },
  //   });

  //   if (!account) return null;

  //   account.permissions.push({
  //     resource: permission,
  //     abilities,
  //     action: this.generateAction(),
  //   });

  //   await this.accountRepository.save(account);

  //   logger.debug(`Added permission "${permission}" with ability "${abilities}".`);

  //   return account;
  // }

  // public async deletePermission(
  //   accountId: string,
  //   permission: string,
  //   abilities: Abilities,
  // ): Promise<Account | null> {
  //   const account = await this.accountRepository
  //     .createQueryBuilder("account")
  //     .where("account.accountId = :accountId", { accountId })
  //     .getOne();

  //   if (!account) return null;

  //   if (account.permissions.length <= 0) return null;

  //   const permIndex = account.permissions.findIndex(
  //     (perm) => perm.resource === permission && perm.abilities === abilities,
  //   );
  //   if (permIndex === -1) return null;

  //   account.permissions.splice(1, permIndex);

  //   await this.accountRepository.save(account);

  //   logger.debug(`Deleted permission "${permission}".`);

  //   return account;
  // }

  public async delete(accountId: string): Promise<boolean> {
    try {
      const account = await this.accountRepository.findOne({ where: { accountId } });
      if (!account) return false;

      this.cache.del(`account_${accountId}`);
      this.cache.del(`account_discord_${account.discordId}`);

      const result = await this.accountRepository.delete({ accountId });
      return result.affected === 1;
    } catch (error) {
      logger.error(`Error deleting account: ${error}`);
      return false;
    }
  }

  public async findTopAccounts(playlist: string, limit: number): Promise<Account[]> {
    try {
      return await this.accountRepository
        .createQueryBuilder("account")
        .where(`account.stats->'${playlist}'->>'wins' IS NOT NULL`)
        .orderBy(`account.stats->'${playlist}'->>'wins'`, "DESC")
        .limit(limit)
        .getMany();
    } catch (error) {
      logger.error(`Error finding top accounts: ${error}`);
      return [];
    }
  }
}
