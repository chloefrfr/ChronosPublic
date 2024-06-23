import type { Repository, UpdateResult } from "typeorm";
import Database from "../Database.wrapper";
import { logger } from "../..";
import type { Account } from "../../tables/account";
import type { ProfileId } from "../../utilities/responses";
import NodeCache from "node-cache";

export default class AccountService {
  private accountRepository: Repository<Account>;

  constructor(private database: Database) {
    this.accountRepository = this.database.getRepository("account");
  }

  public async findUserByAccountId(accountId: string): Promise<Account | null> {
    try {
      const account = await this.accountRepository
        .createQueryBuilder("account")
        .where("account.accountId = :accountId", { accountId })
        .getOne();
      return account;
    } catch (error) {
      logger.error(`Error finding account: ${error}`);
      return null;
    }
  }

  public async findUserByDiscordId(discordId: string): Promise<Account | null> {
    try {
      const account = await this.accountRepository
        .createQueryBuilder("account")
        .where("account.discordId = :discordId", { discordId })
        .getOne();
      return account;
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
      if (result.affected === 1) return true;
      return false;
    } catch (error) {
      logger.error(`Error deleting account: ${error}`);
      return false;
    }
  }

  // public async update(accountId: string, profileId: ProfileId, newData: any) {
  //   try {
  //     const existingProfile = await this.findUserByAccountId(accountId);

  //     if (existingProfile) {
  //       existingProfile.athena = newData;
  //       await this.accountRepository.save(existingProfile);
  //     }

  //     return existingProfile;
  //   } catch (error) {
  //     logger.error(`Error updating account: ${error}`);
  //     return null;
  //   }
  // }
}
