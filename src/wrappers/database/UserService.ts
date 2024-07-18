import { Repository } from "typeorm";
import Database from "../Database.wrapper";
import { logger } from "../..";
import { User } from "../../tables/user";
import NodeCache from "node-cache";

export default class UserService {
  private userRepository: Repository<User>;
  private cache: NodeCache;

  constructor(private database: Database) {
    this.userRepository = this.database.getRepository("user");
    this.cache = new NodeCache();
  }

  private getRandomTTL(): number {
    return Math.floor(Math.random() * (300 - 60 + 1)) + 60;
  }

  public async findUserByUsername(username: string): Promise<User | null> {
    try {
      const cachedUser = this.cache.get<User>(`user_username_${username}`);
      if (cachedUser) {
        return cachedUser;
      } else {
        const user = await this.userRepository.findOne({ where: { username } });
        if (user) {
          const ttl = this.getRandomTTL();
          this.cache.set(`user_username_${username}`, user, ttl);
        }
        return user || null;
      }
    } catch (error) {
      logger.error(`Error finding user by username: ${error}`);
      return null;
    }
  }

  public async findUserByAccountId(accountId: string): Promise<User | null> {
    try {
      const cachedUser = this.cache.get<User>(`user_accountId_${accountId}`);
      if (cachedUser) {
        return cachedUser;
      } else {
        const user = await this.userRepository
          .createQueryBuilder("user")
          .where("user.accountId = :accountId", { accountId })
          .getOne();
        if (user) {
          const ttl = this.getRandomTTL();
          this.cache.set(`user_accountId_${accountId}`, user, ttl);
        }
        return user || null;
      }
    } catch (error) {
      logger.error(`Error finding user by accountId: ${error}`);
      return null;
    }
  }

  public async findUserByDiscordId(discordId: string): Promise<User | null> {
    try {
      const cachedUser = this.cache.get<User>(`user_discordId_${discordId}`);
      if (cachedUser) {
        return cachedUser;
      } else {
        const user = await this.userRepository
          .createQueryBuilder("user")
          .where("user.discordId = :discordId", { discordId })
          .getOne();
        if (user) {
          const ttl = this.getRandomTTL();
          this.cache.set(`user_discordId_${discordId}`, user, ttl);
        }
        return user || null;
      }
    } catch (error) {
      logger.error(`Error finding user by discordId: ${error}`);
      return null;
    }
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    try {
      const cachedUser = this.cache.get<User>(`user_email_${email}`);
      if (cachedUser) {
        return cachedUser;
      } else {
        const user = await this.userRepository.findOne({ where: { email } });
        if (user) {
          const ttl = this.getRandomTTL();
          this.cache.set(`user_email_${email}`, user, ttl);
        }
        return user || null;
      }
    } catch (error) {
      logger.error(`Error finding user by email: ${error}`);
      return null;
    }
  }

  public async findUserByHWID(hwid: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { hwid } });

      return user || null;
    } catch (error) {
      logger.error(`Error finding user by hwid: ${error}`);
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

  public async delete(accountId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { accountId } });
      if (!user) return false;

      this.cache.del(`user_username_${user.username}`);
      this.cache.del(`user_accountId_${accountId}`);
      this.cache.del(`user_discordId_${user.discordId}`);
      this.cache.del(`user_email_${user.email}`);

      const result = await this.userRepository.delete({ accountId });
      return result.affected === 1;
    } catch (error) {
      logger.error(`Error deleting user: ${error}`);
      return false;
    }
  }
}
