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
import type { IProfile } from "../../types/profilesdefs";
import axios from "axios";
import type { Profiles } from "../tables/profiles";

const profileCache = new LRUCache<string, IProfile>({
  max: 1000,
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

  let profile = profileCache.get(profileId);

  if (profile) {
    return profile;
  }

  try {
    profile = await ProfileHelper.getProfile(accountId, profileType);
    if (profile) {
      profileCache.set(profileId, profile);
      return profile;
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get profile for ${profileId}: ${error}`);
    return null;
  }
}

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");
  const timestamp = new Date().toISOString();

  const uahelper = uaparser(useragent);

  if (!useragent)
    return c.json(
      errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
      400,
    );

  if (!uahelper)
    return c.json(
      errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
      400,
    );

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

    if (!profile && profileId !== "athena" && profileId !== "common_core")
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );

    if (!profile)
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );

    const profileUpdates: { [key: string]: any } = {};

    switch (profileId) {
      case "athena":
        profile.stats.attributes.season_num = uahelper.season;

        const { attributes } = profile.stats;
        const past_seasons = attributes.past_seasons || [];
        const currentSeasonIndex = past_seasons.findIndex(
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
              battlepassQuestService.getAll(user.accountId),
              weeklyQuestService.getAll(user.accountId),
            ]);

            for (const quests of dailyQuests) {
              const keys = Object.keys(quests);

              for (const quest of keys) {
                const dailyQuest = quests[quest];

                const profileItem = {
                  templateId: dailyQuest.templateId,
                  attributes: {
                    ...dailyQuest.attributes,
                    ...dailyQuest.attributes.ObjectiveState.reduce((acc, { Name, Value }) => {
                      acc[Name] = Value;
                      return acc;
                    }, {} as Record<string, any>),
                  },
                  quantity: 1,
                };

                profile.items[dailyQuest.templateId] = profileItem;
                await profilesService.updateMultiple([
                  {
                    accountId: user.accountId,
                    type: "athena",
                    data: profile,
                  },
                ]);
              }
            }

            for (const quests of battlepassQuests) {
              const keys = Object.keys(quests);

              for (const quest of keys) {
                const battlepassQuest = quests[quest];

                const profileItem = {
                  templateId: battlepassQuest.templateId,
                  attributes: {
                    ...battlepassQuest.attributes,
                    ...battlepassQuest.attributes.ObjectiveState.reduce(
                      (acc, { BackendName, Stage }) => {
                        acc[BackendName] = Stage;
                        return acc;
                      },
                      {} as Record<string, any>,
                    ),
                  },
                  quantity: 1,
                };

                profile.items[battlepassQuest.templateId] = profileItem;
                await profilesService.updateMultiple([
                  {
                    accountId: user.accountId,
                    type: "athena",
                    data: profile,
                  },
                ]);
              }
            }

            for (const quests of weeklyQuests) {
              const keys = Object.keys(quests);

              for (const quest of keys) {
                const weeklyQuest = quests[quest];

                const profileItem = {
                  templateId: weeklyQuest.templateId,
                  attributes: {
                    ...weeklyQuest.attributes,
                    ...weeklyQuest.attributes.ObjectiveState.reduce(
                      (acc, { BackendName, Stage }) => {
                        acc[BackendName] = Stage;
                        return acc;
                      },
                      {} as Record<string, any>,
                    ),
                  },
                  quantity: 1,
                };

                profile.items[weeklyQuest.templateId] = profileItem;
                await profilesService.updateMultiple([
                  {
                    accountId: user.accountId,
                    type: "athena",
                    data: profile,
                  },
                ]);
              }
            }
          }
        } else {
          past_seasons.push({
            seasonNumber: attributes.season_num as number,
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

          Object.assign(attributes, {
            xp: 0,
            level: 1,
            book_purchased: false,
            book_level: 1,
            book_xp: 0,
          });
        }

        attributes.past_seasons = past_seasons;
        profileUpdates["athena"] = profile;
        break;

      case "common_core":
        if (!profile.stats.attributes.permissions) {
          profile.stats.attributes.permissions = [];
        }

        account.permissions.forEach((permission) => {
          if (!profile.stats.attributes.permissions!.includes(permission.resource)) {
            profile.stats.attributes.permissions!.push(permission.resource);
          }
        });

        profileUpdates["common_core"] = profile;
        break;
    }
    await profilesService.updateMultiple(
      Object.entries(profileUpdates).map(([type, data]) => ({
        accountId: user.accountId,
        type: type as keyof Profiles,
        data,
      })),
    );

    const applyProfileChanges = [
      {
        changeType: "fullProfileUpdate",
        profile,
      },
    ];

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    void logger.error(`Error in QueryProfile: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
