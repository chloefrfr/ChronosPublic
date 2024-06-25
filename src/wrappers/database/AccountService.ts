import { Repository } from "typeorm";
import Database from "../Database.wrapper";
import { logger } from "../..";
import { Account } from "../../tables/account";
import NodeCache from "node-cache";

export default class AccountService {
  private accountRepository: Repository<Account>;
  private cache: NodeCache;

  constructor(private database: Database) {
    this.accountRepository = this.database.getRepository("account");
    this.cache = new NodeCache();
  }

  private getRandomTTL(): number {
    return Math.floor(Math.random() * (300 - 60 + 1)) + 60;
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

  public async delete(accountId: string): Promise<boolean> {
    try {
      const result = await this.accountRepository.delete({ accountId });
      return result.affected === 1;
    } catch (error) {
      logger.error(`Error deleting account: ${error}`);
      return false;
    }
  }
}
