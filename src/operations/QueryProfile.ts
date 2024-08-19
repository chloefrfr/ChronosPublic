import type { Context } from "hono";
import { userService, accountService, logger, profilesService } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import { LRUCache } from "lru-cache";
import type { IProfile } from "../../types/profilesdefs";

const profileCache = new LRUCache<string, { data: any; timestamp: number }>({
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

// Caching the new items could be slow at times
// And there's 100% a better way to do this
// but it works and thats what counts :)
export async function handleProfileSelection(profileId: ProfileId, accountId: string) {
  const profileTypes: { [key in ProfileId]?: AllowedProfileTypes } = {
    athena: "athena",
    profile0: "athena",
    common_core: "common_core",
    common_public: "common_public",
    campaign: "campaign",
    metadata: "metadata",
    theater0: "theater0",
    creative: "creative",
    collections: "collections",
    collection_book_people0: "collection_book_people0",
    collection_book_schematics0: "collection_book_schematics0",
    outpost0: "outpost0",
  };

  const profileType = profileTypes[profileId];

  if (!profileType) {
    logger.error(`Invalid Profile Type: ${profileId}`);
    return null;
  }

  const cachedEntry = profileCache.get(profileId);

  if (cachedEntry) {
    return cachedEntry.data as IProfile;
  }

  const profilePromise = await ProfileHelper.getProfile(accountId, profileType);

  profileCache.set(profileId, { data: await profilePromise, timestamp: Date.now() });

  return profilePromise || null;
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

    switch (profileId) {
      case "collections":
        profile.stats.attributes.current_season = uahelper.season;
        await profilesService.update(user.accountId, "athena", profile);
        break;
      case "athena":
        profile.stats.attributes.season_num = uahelper.season;

        const { attributes } = profile.stats;

        let { past_seasons } = attributes;

        if (!Array.isArray(past_seasons)) {
          past_seasons = [];
          attributes.past_seasons = past_seasons;
        }

        let currentSeasonIndex = -1;
        for (let i = 0; i < past_seasons.length; i++) {
          if (past_seasons[i].seasonNumber === uahelper.season) {
            currentSeasonIndex = i;
            break;
          }
        }

        if (currentSeasonIndex !== -1) {
          const currentSeason = past_seasons[currentSeasonIndex];
          attributes.book_level = currentSeason.bookLevel;
          attributes.book_xp = currentSeason.bookXp;
          attributes.xp = currentSeason.seasonXp;
          attributes.book_purchased = currentSeason.purchasedVIP;
          attributes.level = currentSeason.seasonLevel;
          attributes.season!.numWins = currentSeason.numWins;
          attributes.season!.numLowBracket = currentSeason.numLowBracket;
          attributes.season!.numHighBracket = currentSeason.numHighBracket;
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
        for (const permission of account.permissions) {
          profile.stats.attributes.permissions!.push(permission.resource);
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
    void logger.error(`Error in QueryProfile: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
