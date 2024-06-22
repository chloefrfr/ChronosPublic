import type { Context } from "hono";
import { userService, accountService, logger } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import { Profiles } from "../tables/profiles";

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

    const profile = await ProfileHelper.getProfile(profileId);

    if (!profile && profileId !== "athena" && profileId !== "common_core")
      return c.json(MCPResponses.generate({ rvn }, [], profileId));

    if (profileId === "athena") {
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
      } else {
        past_seasons.push({
          seasonNumber: attributes.season_num,
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

      await Profiles.createQueryBuilder()
        .update()
        .set({ profile })
        .where("type = :type", { type: profileId })
        .execute();
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
