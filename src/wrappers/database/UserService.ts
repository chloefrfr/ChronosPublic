import type { Repository } from "typeorm";
import Database from "../Database.wrapper";
import { logger } from "../..";
import type { User } from "../../tables/user";

export default class UserService {
  private userRepository: Repository<User>;

  constructor(private database: Database) {
    this.userRepository = this.database.getRepository("user");
  }

  public async findUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { username } });
    } catch (error) {
      logger.error(`Error finding user: ${error}`);
      return null;
    }
  }

  public async findUserByAccountId(accountId: string): Promise<User | null> {
    try {
      const user = await this.userRepository
        .createQueryBuilder("user")
        .where("user.accountId = :accountId", { accountId })
        .getOne();
      return user;
    } catch (error) {
      logger.error(`Error finding user: ${error}`);
      return null;
    }
  }

  public async findUserByDiscordId(discordId: string): Promise<User | null> {
    try {
      const user = await this.userRepository
        .createQueryBuilder("user")
        .where("user.discordId = :discordId", { discordId })
        .getOne();
      return user;
    } catch (error) {
      logger.error(`Error finding user: ${error}`);
      return null;
    }
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      logger.error(`Error finding user: ${error}`);
      return null;
    }
  }

  public async create(user: Partial<User>): Promise<User | null> {
    try {
      const newUser = this.userRepository.create(user);
      await this.userRepository.save(newUser);
      return newUser;
    } catch (error) {
      logger.error(`Error creating user: ${error}`);
      return null;
    }
  }
}
