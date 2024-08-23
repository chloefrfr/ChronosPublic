import { accountService, app, friendsService, logger, userService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";
import type { Stats } from "../tables/account";

const controller = app.basePath("/fortnite/api");
const proxy = app.basePath("/statsproxy/api");

type PlaylistType = "solos" | "duos" | "squads" | "ltm";

// pc_m0_p10 (PC - DUOS)
// pc_m0_p2 (PC - SOLOS)
// pc_m0_p9 (PC - SQUADS)

export default function () {
  controller.get("/game/v2/leaderboards/cohort/:accountId", Validation.verifyToken, async (c) => {
    const playlist = c.req.query("playlist");
    const timestamp = new Date().toISOString();
    const accountId = c.req.param("accountId");

    if (!playlist)
      return c.json(
        errors.createError(400, c.req.url, "Query parameter 'playlist' not found.", timestamp),
        400,
      );

    const user = await userService.findUserByAccountId(accountId);
    const account = await accountService.findUserByAccountId(accountId);

    if (!user || !account)
      return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

    logger.debug(`Playlist: ${playlist}`);

    try {
      const playlists: { [key: string]: PlaylistType } = {
        pc_m0_p10: "solos",
        pc_m0_p2: "duos",
        pc_m0_p9: "squads",
      };

      const specificPlaylist = playlists[playlist];
      const stats = account.stats[specificPlaylist];

      if (!stats)
        return c.json(errors.createError(404, c.req.url, "Stat not found..", timestamp), 404);

      const friends = await friendsService.findFriendByAccountId(user.accountId);

      if (!friends)
        return c.json(errors.createError(404, c.req.url, "No friends found.", timestamp), 404);

      const accountIds: string[] = [];

      for (const acceptedFriends of friends.accepted) {
        accountIds.push(acceptedFriends.accountId);
      }

      return c.json({
        accountId: user.accountId,
        cohortAccountIds: accountIds,
        expiresAt: "9999-01-01T00:00:00Z",
        playlist,
      });
    } catch (error) {
      logger.error(`Error getting leaderboard data: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
    }
  });

  proxy.get(
    "/statsv2/leaderboards/:leaderboardName",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const leaderboardName = c.req.param("leaderboardName");

      const entries: object[] = [];

      logger.debug(`leaderboardName: ${leaderboardName}`);

      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = await permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const user = await userService.findUserByAccountId(c.get("user").accountId);
      const account = await accountService.findUserByAccountId(c.get("user").accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      try {
        const playlists: { [key: string]: PlaylistType } = {
          br_placetop1_keyboardmouse_m0_playlist_defaultsolo: "solos",
          br_placetop1_keyboardmouse_m0_playlist_defaultduo: "duos",
          br_placetop1_keyboardmouse_m0_playlist_defaultsquad: "squads",
        };

        const specificPlaylist = playlists[leaderboardName];
        const stats = account.stats[specificPlaylist];

        if (!stats)
          return c.json(errors.createError(404, c.req.url, "Stat not found.", timestamp), 404);

        const topAccounts = await accountService.findTopAccounts(specificPlaylist, 1000);

        if (topAccounts.length === 0) {
          return c.json({
            entries: [],
            maxSize: 0,
          });
        }

        for (const topAccount of topAccounts) {
          const topAccountStats = topAccount.stats[specificPlaylist];

          if (!topAccountStats)
            return c.json(errors.createError(404, c.req.url, "Stat not found.", timestamp), 404);

          entries.push({
            account: topAccount.accountId,
            value: topAccountStats.wins,
          });
        }

        return c.json({
          entries,
          maxSize: entries.length,
        });
      } catch (error) {
        logger.error(`Error getting leaderboard entries: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
      }
    },
  );

  /* 
  {
    "startTime": 0,
    "endTime": 9223372036854775807,
    "stats": {
      "br_score_keyboardmouse_m0_playlist_defaultsolo": 472
    },
    "accountId": "17aa73e6e694484296cf00d7f11f4acb"
  }
  */

  controller.get(
    "/statsv2/account/:accountId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const accountId = c.req.param("accountId");

      const user = await userService.findUserByAccountId(accountId);
      const account = await accountService.findUserByAccountId(accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      try {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysUntilEndOfWeek = 6 - dayOfWeek + 1;
        endOfWeek.setDate(now.getDate() + daysUntilEndOfWeek);
        endOfWeek.setHours(23, 59, 59, 999);

        const startTime = startOfDay.getTime();
        const endTime = endOfWeek.getTime();

        return c.json({
          startTime,
          endTime,
          stats: {
            br_score_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].wins,
            br_kills_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].kills,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsolo:
              account.stats["solos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultduo:
              account.stats["duos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsquad:
              account.stats["squads"].matchesplayed,
            br_placetop25_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].top25,
            br_placetop10_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].top10,
            br_placetop1_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].top1,
          },
          accountId: user.accountId,
        });
      } catch (error) {
        logger.error(`Failed to get stats: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
      }
    },
  );

  proxy.get(
    "/statsv2/account/:accountId",
    Validation.verifyPermissions,
    Validation.verifyToken,
    async (c) => {
      const permissions = c.get("permission");
      const timestamp = new Date().toISOString();

      const hasPermission = permissions.hasPermission("fortnite:stats", "READ");

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn("fortnite:stats", "READ"),
            timestamp,
          ),
          401,
        );

      const accountId = c.req.param("accountId");

      const user = await userService.findUserByAccountId(accountId);
      const account = await accountService.findUserByAccountId(accountId);

      if (!user || !account)
        return c.json(errors.createError(404, c.req.url, "User not found.", timestamp), 404);

      try {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(now);
        const dayOfWeek = now.getDay();
        const daysUntilEndOfWeek = 6 - dayOfWeek + 1;
        endOfWeek.setDate(now.getDate() + daysUntilEndOfWeek);
        endOfWeek.setHours(23, 59, 59, 999);

        const startTime = startOfDay.getTime();
        const endTime = endOfWeek.getTime();

        return c.json({
          startTime,
          endTime,
          stats: {
            br_score_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].wins,
            br_score_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].wins,
            br_kills_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].kills,
            br_kills_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].kills,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsolo:
              account.stats["solos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultduo:
              account.stats["duos"].matchesplayed,
            br_matchesplayed_keyboardmouse_m0_playlist_defaultsquad:
              account.stats["squads"].matchesplayed,
            br_placetop25_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].top25,
            br_placetop25_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].top25,
            br_placetop10_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].top10,
            br_placetop10_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].top10,
            br_placetop1_keyboardmouse_m0_playlist_defaultsolo: account.stats["solos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultduo: account.stats["duos"].top1,
            br_placetop1_keyboardmouse_m0_playlist_defaultsquad: account.stats["squads"].top1,
          },
          accountId: user.accountId,
        });
      } catch (error) {
        logger.error(`Failed to get stats: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
      }
    },
  );

  proxy.post("/statsv2/query", Validation.verifyPermissions, Validation.verifyToken, async (c) => {
    const permissions = c.get("permission");
    const timestamp = new Date().toISOString();

    const hasPermission = permissions.hasPermission("fortnite:stats", "READ");

    if (!hasPermission)
      return c.json(
        errors.createError(
          401,
          c.req.url,
          permissions.errorReturn("fortnite:stats", "READ"),
          timestamp,
        ),
        401,
      );

    const body = await c.req.json();
    const query = c.req.query();

    console.log(body);
    console.log(query);

    return c.json({});
  });
}
