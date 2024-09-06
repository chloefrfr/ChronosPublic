import { accountService, app, config, logger, userService } from "..";
import { GameserverIps } from "../../hosting/hostOptions";
import { Validation } from "../middleware/validation";
import { servers } from "../sockets/matchmaker/server";
import { XmppService, type PartyInfo, type StatusInfo } from "../sockets/xmpp/saved/XmppServices";
import { Encryption } from "../utilities/encryption";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";

export default function () {
  app.get(
    "/fortnite/api/game/v2/matchmakingservice/ticket/player/:accountId",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const bucketId = c.req.query("bucketId");
      const timestamp = new Date().toISOString();

      const account = await accountService.findUserByAccountId(accountId);
      const user = await userService.findUserByAccountId(accountId);

      const useragent = c.req.header("User-Agent");

      if (!useragent)
        return c.json(
          errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
          400,
        );

      const uahelper = uaparser(useragent);

      if (!uahelper)
        return c.json(
          errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
          400,
        );

      const accessToken = c.req.header("Authorization")?.split("bearer ")[1].replace("eg1~", "");

      if (!accessToken || !account || !user)
        return c.json(errors.createError(400, c.req.url, "Failed to find user.", timestamp));

      // this should literally never happen
      if (accountId !== user.accountId)
        return c.json(errors.createError(400, c.req.url, "This is not your account.", timestamp));

      if (user.banned)
        return c.json(errors.createError(403, c.req.url, "You are banned", timestamp), 403);

      const bucketIds = bucketId?.split(":");

      if (bucketIds!.length < 4 || bucketIds!.length !== 4 || typeof bucketId !== "string")
        return c.json(errors.createError(400, c.req.url, "Invalid BucketId.", timestamp), 400);

      if (!bucketIds![2] || !bucketIds)
        return c.json(errors.createError(400, c.req.url, "Invalid BucketId.", timestamp), 400);

      const { id: partyId = "party_not_found", members: partyMembers = [] } =
        Object.values(XmppService.parties).reduce((foundParty, party) => {
          if (foundParty) return foundParty;
          const hasMember = party.members.some((member) => member.account_id === accountId);
          return hasMember ? party : null;
        }, null as PartyInfo | null) ?? {};

      const playlist = bucketIds![3];
      const region = bucketIds![2];

      // TODO - Add Some checking for a specific playlist. (eg, arena)
      // TODO - Custom Matchmaking

      const subRegions = c.req.query("player.subregions");
      const platform = c.req.query("player.platform");
      const inputType = c.req.query("player.inputTypes");
      const input = c.req.query("player.input");
      const partyPlayerIds = c.req.query("partyPlayerIds");

      const client = XmppService.clients.find((client) => client.accountId === user.accountId);

      if (!client)
        return c.json(errors.createError(404, c.req.url, "Client not found.", timestamp), 404);

      const clientStatus = client.lastPresenceUpdate.status;
      let selectedPartyId: string | undefined = "";

      if (clientStatus) {
        const parsedStatus: StatusInfo = JSON.parse(clientStatus);

        if (parsedStatus) {
          for (const key in parsedStatus.Properties) {
            const joinInfo = key.toLowerCase().startsWith("party.joininfo");

            if (parsedStatus.Properties[key].partyId === "")
              return logger.error(`Property 'partyId' is not valid.`);

            if (joinInfo && parsedStatus.Properties) {
              selectedPartyId = parsedStatus.Properties[key].partyId;
              break;
            }
          }
        }
      }

      const payload = {
        playerId: user.accountId,
        partyPlayerId: partyPlayerIds,
        bucketId: bucketId,
        attributes: {
          "player.userAgent": c.req.header("User-Agent"),
          "player.preferredSubregion": subRegions!.split(",")[0],
          "player.option.spectator": "false",
          "player.inputTypes": inputType,
          "player.revision": c.req.query("player.revision"),
          "player.teamFormat": "fun",
          "player.subregions": region,
          "player.season": uahelper.season,
          "player.option.partyId": partyId === "party_not_found" ? selectedPartyId : partyId,
          "player.platform": platform,
          "player.option.linkType": "DEFAULT",
          "player.input": input,
          "playlist.revision": c.req.query("playlist.revision"),
          "player.option.fillTeam": c.req.query("player.option.fillTeam"),
          "player.option.uiLanguage": "en",
          "player.option.microphoneEnabled": c.req.query("player.option.microphoneEnabled"),
        },
        expiresAt: new Date(new Date().getTime() + 32 * 60 * 60 * 1000).toISOString(),
        nonce: uuid().replace(/-/, ""),
      };

      return c.json({
        serviceUrl: "ws://127.0.0.1:443",
        ticketType: "mms-player",
        payload: JSON.stringify(payload),
        signature: Encryption.encrypt(
          JSON.stringify({
            accountId: user.accountId,
            bucketId: bucketId,
            attributes: payload.attributes,
            expiresAt: payload.expiresAt,
            nonce: payload.nonce,
            sessionId: uuid(),
            matchId: uuid(),
            region,
            userAgent: c.req.header("User-Agent"),
            playlist,
          }),
          config.client_secret,
        ),
      });
    },
  );

  app.get(
    "/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId",
    Validation.verifyToken,
    async (c) => {
      const sessionId = c.req.param("sessionId");
      const accountId = c.req.param("accountId");

      const [user] = await Promise.all([userService.findUserByAccountId(accountId)]);
      const timestamp = new Date().toISOString();

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user!", timestamp), 404);
      if (user.banned)
        return c.json(errors.createError(403, c.req.url, "User is banned!", timestamp), 403);

      const session = servers.find((s) => s.sessionId === sessionId);

      if (!session)
        return c.json(
          errors.createError(
            404,
            c.req.url,
            `Failed to find session with the id ${sessionId}`,
            timestamp,
          ),
          404,
        );

      return c.json({
        accountId: user.accountId,
        sessionId: session.sessionId,
        key: "none",
      });
    },
  );

  app.get("/fortnite/api/matchmaking/session/:sessionId", Validation.verifyToken, async (c) => {
    const sessionId = c.req.param("sessionId");

    const session = servers.find((s) => s.sessionId === sessionId);
    const timestamp = new Date().toISOString();

    if (!session)
      return c.json(
        errors.createError(
          404,
          c.req.url,
          `Failed to find session with the id ${sessionId}`,
          timestamp,
        ),
        404,
      );

    const currentBucketId = session.identifier.split(":")[0];

    logger.debug(`Session ${session.address}:${session.port} - ${currentBucketId}`);

    return c.json({
      id: session.sessionId,
      ownerId: uuid().replace(/-/gi, "").toUpperCase(),
      ownerName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
      serverName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
      serverAddress: GameserverIps[session.address],
      serverPort: session.port,
      maxPublicPlayers: 220,
      openPublicPlayers: 175,
      maxPrivatePlayers: 0,
      openPrivatePlayers: 0,
      attributes: {
        REGION_s: "EU",
        GAMEMODE_s: "FORTATHENA",
        ALLOWBROADCASTING_b: true,
        SUBREGION_s: "GB",
        DCID_s: "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
        tenant_s: "Fortnite",
        MATCHMAKINGPOOL_s: "Any",
        STORMSHIELDDEFENSETYPE_i: 0,
        HOTFIXVERSION_i: 0,
        PLAYLISTNAME_s: "Playlist_DefaultSolo",
        SESSIONKEY_s: uuid().replace(/-/gi, "").toUpperCase(),
        TENANT_s: "Fortnite",
        BEACONPORT_i: 15009,
      },
      publicPlayers: [],
      privatePlayers: [],
      totalPlayers: 45,
      allowJoinInProgress: false,
      shouldAdvertise: false,
      isDedicated: false,
      usesStats: false,
      allowInvites: false,
      usesPresence: false,
      allowJoinViaPresence: true,
      allowJoinViaPresenceFriendsOnly: false,
      buildUniqueId: parseInt(currentBucketId) || 13920814,
      lastUpdated: new Date().toISOString(),
      started: false,
    });
  });

  app.post(
    "/fortnite/api/matchmaking/session/:sessionId/join",
    Validation.verifyToken,
    async (c) => {
      const sessionId = c.req.param("sessionId");
      const timestamp = new Date().toISOString();

      const session = servers.find((s) => s.sessionId === sessionId);

      if (!session)
        return c.json(
          errors.createError(
            404,
            c.req.url,
            `Failed to find session with the id ${sessionId}`,
            timestamp,
          ),
          404,
        );

      const user = c.get("user");

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user!", timestamp), 404);
      if (user.banned)
        return c.json(errors.createError(403, c.req.url, "User is banned!", timestamp), 403);

      return c.body(null, 200);
    },
  );

  app.get(
    "/fortnite/api/matchmaking/session/findPlayer/:sessionId",
    Validation.verifyToken,
    async (c) => {
      const sessionId = c.req.param("sessionId");
      const timestamp = new Date().toISOString();

      const session = servers.find((s) => s.sessionId === sessionId);

      // so it doesn't freak out, ill find a better way to do this later.
      if (!session) return c.json([], 200);

      const user = c.get("user");

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user!", timestamp), 404);
      if (user.banned)
        return c.json(errors.createError(403, c.req.url, "User is banned!", timestamp), 403);

      return c.json([], 200);
    },
  );

  app.post("/fortnite/api/matchmaking/session", Validation.verifyToken, async (c) => {
    const timestamp = new Date().toISOString();

    let body;

    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't Valid JSON!", timestamp));
    }

    let response;

    for (const allServers of servers) {
      const currentBucketId = allServers.identifier.split(":")[0];

      logger.debug(
        `Session ${allServers.sessionId} ${allServers.address}:${allServers.port} - ${currentBucketId}`,
      );

      response = {
        sessionId: allServers.sessionId,
        serverAddress: allServers.address,
        serverPort: body.serverPort,
        ...body,
      };
    }

    return c.json(response);
  });
}
