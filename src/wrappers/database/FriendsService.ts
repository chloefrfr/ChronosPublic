import type { Repository } from "typeorm";
import type { Friends } from "../../tables/friends";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export default class FriendsService {
  private friendsRepository: Repository<Friends>;

  constructor(private database: Database) {
    this.friendsRepository = this.database.getRepository("friends");
  }

  public async findFriendByAccountId(accountId: string): Promise<Friends | null> {
    try {
      const friend = await this.friendsRepository
        .createQueryBuilder("friends")
        .where("friends.accountId = :accountId", { accountId })
        .getOne();
      return friend;
    } catch (error) {
      logger.error(`Error finding friend: ${error}`);
      return null;
    }
  }

  public async create(friends: Partial<Friends>): Promise<Friends | null> {
    try {
      const newFriend = this.friendsRepository.create(friends);
      await this.friendsRepository.save(newFriend);
      return newFriend;
    } catch (error) {
      logger.error(`Error creating friend: ${error}`);
      return null;
    }
  }

  public async delete(accountId: string): Promise<boolean> {
    try {
      const result = await this.friendsRepository.delete({ accountId });
      if (result.affected === 1) return true;
      return false;
    } catch (error) {
      logger.error(`Error deleting friends: ${error}`);
      return false;
    }
  }
}
