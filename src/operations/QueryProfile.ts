import type { Context } from "hono";
import {
  userService,
  accountService,
  logger,
  profilesService,
  config,
  dailyQuestService,
  battlepassQuestService,
  weeklyQuestService,
} from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import { LRUCache } from "lru-cache";
import type { IProfile, ItemValue } from "../../types/profilesdefs";
import type { Attributes, ObjectiveState } from "../tables/storage/other/dailyQuestStorage";
import type { QuestItem } from "../../types/questdefs";

const profileCache = new LRUCache<string, { data: IProfile; timestamp: number }>({
  max: 1000,
  ttl: 1000 * 60 * 1,
});

type AllowedProfileTypes =
  | "athena"
  | "common_core"
  | "common_public"
  | "campaign"
  | "metadata"
  | "theater0"
  | "collection_book_people0"
  | "collection_book_schematics0"
  | "outpost0"
  | "creative"
  | "collections"
  | "id"
  | "hasId"
  | "reload";

const profileTypes = new Map<ProfileId, AllowedProfileTypes>([
  ["athena", "athena"],
  ["profile0", "athena"],
  ["common_core", "common_core"],
  ["common_public", "common_public"],
  ["campaign", "campaign"],
  ["metadata", "metadata"],
  ["theater0", "theater0"],
  ["creative", "creative"],
  ["collections", "collections"],
  ["collection_book_people0", "collection_book_people0"],
  ["collection_book_schematics0", "collection_book_schematics0"],
  ["outpost0", "outpost0"],
]);

export async function handleProfileSelection(
  profileId: ProfileId,
  accountId: string,
): Promise<IProfile | null> {
  const profileType = profileTypes.get(profileId);

  if (!profileType) {
    logger.error(`Invalid Profile Type: ${profileId}`);
    return null;
  }

  const cacheKey = `${accountId}:${profileId}`;
  const cachedEntry = profileCache.get(cacheKey);

  if (cachedEntry) {
    logger.info(`Cache hit for profileId: ${profileId} and accountId: ${accountId}`);
    return cachedEntry.data;
  }

  logger.info(`Cache miss for profileId: ${profileId} and accountId: ${accountId}.`);

  const profile = await ProfileHelper.getProfile(accountId, profileType);

  if (!profile) {
    logger.warn(`Profile not found for profileId: ${profileId} and accountId: ${accountId}`);
    return null;
  }

  logger.info(`Caching profileId: ${profileId} and accountId: ${accountId}`);
  profileCache.set(cacheKey, { data: profile, timestamp: Date.now() });

  return profile;
}

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");
  const timestamp = new Date().toISOString();

  const uahelper = uaparser(useragent);

  if (!useragent) {
    return c.json(
      errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
      400,
    );
  }

  if (!uahelper) {
    return c.json(
      errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
      400,
    );
  }

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
        404,
      );
    }

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );
    }

    switch (profileId) {
      case "athena":
        profile.stats.attributes.season_num = uahelper.season;

        const { attributes } = profile.stats;
        let past_seasons = attributes.past_seasons || [];

        let currentSeasonIndex = past_seasons.findIndex(
          (season) => season.seasonNumber === uahelper.season,
        );

        if (currentSeasonIndex !== -1) {
          const currentSeason = past_seasons[currentSeasonIndex];

          Object.assign(attributes, {
            book_level: currentSeason.bookLevel,
            book_xp: currentSeason.bookXp,
            xp: currentSeason.seasonXp,
            book_purchased: currentSeason.purchasedVIP,
            level: currentSeason.seasonLevel,
            season: {
              numWins: currentSeason.numWins,
              numLowBracket: currentSeason.numLowBracket,
              numHighBracket: currentSeason.numHighBracket,
            },
          });

          if (currentSeason.seasonNumber === config.currentSeason) {
            const [dailyQuests, battlepassQuests, weeklyQuests] = await Promise.all([
              dailyQuestService.get(user.accountId),
              battlepassQuestService.getAll(user.accountId, uahelper.season),
              weeklyQuestService.getAll(user.accountId, config.currentSeason),
            ]);

            const updateProfileItems = (quests: Record<string, QuestItem>[]) => {
              quests.forEach((quest) => {
                Object.values(quest).forEach((questItem) => {
                  profile.items[questItem.templateId] = {
                    templateId: questItem.templateId,
                    attributes: {
                      ...questItem.attributes,
                      ...questItem.attributes.ObjectiveState.reduce<Record<string, any>>(
                        (acc, { BackendName, Stage }) => {
                          acc[BackendName] = Stage;
                          return acc;
                        },
                        {},
                      ),
                    },
                    quantity: 1,
                  };
                });
              });
            };

            updateProfileItems(dailyQuests as any);
            updateProfileItems(battlepassQuests);
            updateProfileItems(weeklyQuests);

            await profilesService.updateMultiple([
              {
                accountId: user.accountId,
                type: "athena",
                data: profile,
              },
            ]);
          } else {
            const isQuestBundle = (itemId: string, season: number): boolean =>
              itemId.includes("Quest:") && itemId.includes(`QuestBundle_S${season}`);

            const isMissionOrChallenge = (itemId: string, season: number): boolean =>
              itemId.includes(`MissionBundle_S${season}`) &&
              itemId.includes(`ChallengeBundleSchedule:season${season}_`) &&
              !itemId.includes("_Repeatable_");

            const shouldRemoveItem = (itemId: string, season: number): boolean =>
              isQuestBundle(itemId, season) || isMissionOrChallenge(itemId, season);

            const deleteTasks = async (
              itemId: string,
              season: number,
              accountId: string,
            ): Promise<string | null> => {
              try {
                const [weeklyExists, battlepassExists] = await Promise.all([
                  weeklyQuestService.get(accountId, season, itemId),
                  battlepassQuestService.get(accountId, season, itemId),
                ]);

                if (weeklyExists) {
                  await weeklyQuestService.deleteQuest(accountId, season, itemId);
                }

                if (battlepassExists) {
                  await battlepassQuestService.deleteQuest(accountId, season, itemId);
                }

                return itemId;
              } catch (error) {
                logger.error(`Failed to delete quest with the itemId ${itemId}: ${error}`);
                return null;
              }
            };

            if (profile.items) {
              const CHUNK_SIZE = 20;

              const itemKeys = Object.keys(profile.items);

              for (let i = 0; i < itemKeys.length; i += CHUNK_SIZE) {
                const chunk = itemKeys.slice(i, i + CHUNK_SIZE);
                await Promise.all(
                  chunk.map((itemId) =>
                    shouldRemoveItem(itemId, uahelper.season)
                      ? deleteTasks(itemId, uahelper.season, user.accountId)
                      : Promise.resolve(null),
                  ),
                );
              }
            }
          }
        } else {
          past_seasons.push({
            seasonNumber: uahelper.season,
            numWins: 0,
            numHighBracket: 0,
            numLowBracket: 0,
            seasonXp: 0,
            seasonLevel: 1,
            bookXp: 0,
            bookLevel: 1,
            purchasedVIP: false,
            numRoyalRoyales: 0,
            survivorTier: 0,
            survivorPrestige: 0,
          });

          attributes.xp = 0;
          attributes.level = 1;
          attributes.book_purchased = false;
          attributes.book_level = 1;
          attributes.book_xp = 0;
        }

        attributes.past_seasons = past_seasons;

        await profilesService.update(user.accountId, "athena", profile);
        break;

      case "common_core":
        if (!profile.stats.attributes.permissions) {
          profile.stats.attributes.permissions = [];
        }

        for (const permission of account.permissions) {
          if (!profile.stats.attributes.permissions.includes(permission.resource)) {
            profile.stats.attributes.permissions.push(permission.resource);
          }
        }

        await profilesService.update(user.accountId, "common_core", profile);
        break;
    }

    const applyProfileChanges = [
      {
        changeType: "fullProfileUpdate",
        profile,
      },
    ];

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`Error in QueryProfile: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
