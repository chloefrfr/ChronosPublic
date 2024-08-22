import {
  type EntitySubscriberInterface,
  EventSubscriber,
  type InsertEvent,
  type UpdateEvent,
  type RemoveEvent,
} from "typeorm";
import { Profiles } from "../../tables/profiles";
import { LRUCache } from "lru-cache";
import { logger } from "../..";

@EventSubscriber()
export class ProfilesSubscriber implements EntitySubscriberInterface<Profiles> {
  constructor(private cache: LRUCache<string, Profiles>) {}

  listenTo() {
    return Profiles;
  }

  async afterInsert(event: InsertEvent<Profiles>): Promise<void> {
    if (event.entity) {
      this.invalidateCache(event.entity as Profiles);
    }
  }

  async afterUpdate(event: UpdateEvent<Profiles>): Promise<void> {
    if (event.entity) {
      this.invalidateCache(event.entity as Profiles);
    }
  }

  async afterRemove(event: RemoveEvent<Profiles>): Promise<void> {
    if (event.entity) {
      this.cache.delete(this.generateCacheKey(event.entity.accountId));
    }
  }

  private invalidateCache(profile: Profiles) {
    try {
      this.cache.set(this.generateCacheKey(profile.accountId), profile);
    } catch (error) {
      logger.error(`Error invalidating cache for accountId ${profile.accountId}: ${error}`);
    }
  }

  private generateCacheKey(accountId: string): string {
    return `profile_accountId_${accountId}`;
  }
}
