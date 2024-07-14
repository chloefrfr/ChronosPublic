import { logger, profilesService } from "..";
import type { Athena, CommonCore, CommonPublic } from "../../types/profilesdefs";
import type { Profiles } from "../tables/profiles";

export class Caching {
  private static cache = new Map<string, { profile: Profiles; updatedAt: number }>();

  public static getFromCache(
    cacheKey: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Athena | CommonCore | CommonPublic | null {
    const cachedItem = Caching.cache.get(cacheKey);

    if (cachedItem) {
      return cachedItem.profile[profileName] as Athena | CommonCore | CommonPublic;
    }

    return null;
  }

  public static saveToCache(cacheKey: string, profile: Profiles): void {
    Caching.cache.set(cacheKey, { profile, updatedAt: Date.now() });
  }

  public static async updateCacheAsync(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<void> {
    try {
      const profile = await profilesService.findByName(accountId, profileName);
      if (!profile) {
        logger.warn(`Profile of type ${profileName} not found while updating cache`);
        return;
      }

      const cacheKey = `${accountId}_${profileName}`;
      Caching.saveToCache(cacheKey, profile);
    } catch (error) {
      logger.error(`Failed to update cache for profile ${profileName}: ${error}`);
    }
  }

  static invalidateCache(
    accountId: string,
    profileName: keyof Omit<Profiles, "id" | "accountId">,
  ): void {
    const cacheKey = `${accountId}_${profileName}`;
    Caching.cache.delete(cacheKey);
  }
}
