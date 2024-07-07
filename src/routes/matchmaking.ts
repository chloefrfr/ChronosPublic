import { accountService, app, config, logger, userService } from "..";
import { Validation } from "../middleware/validation";
import { XmppService, type PartyInfo } from "../sockets/xmpp/saved/XmppServices";
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

      if (partyId === "party_not_found")
        return c.json(errors.createError(404, c.req.url, "Party not found.", timestamp), 404);

      const membersInParty: string[] = partyMembers
        .filter((member) => member.account_id)
        .map((member) => member.account_id);

      const currentBuildUniqueId = bucketIds![0];
      const playlist = bucketIds![3];
      const region = bucketIds![2];

      logger.debug(`PartyId: ${partyId}`);
      logger.debug(`members: ${JSON.stringify(membersInParty)}`);

      // TODO - Add Some checking for a specific playlist. (eg, arena)
      // TODO - Custom Matchmaking

      const subRegions = c.req.query("player.subregions");
      const platform = c.req.query("player.platform");
      const inputType = c.req.query("player.inputTypes");
      const input = c.req.query("player.input");
      const partyPlayerIds = c.req.query("partyPlayerIds");

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
          "player.option.partyId": partyId,
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
        serviceUrl: `ws://26.166.13.159:8413`,
        ticketType: "mms-player",
        payload: JSON.stringify(payload),
        signature: Encryption.encrypt(
          JSON.stringify({
            accountId: user.accountId,
            bucketId: bucketId,
            attributes: payload.attributes,
            expiresAt: payload.expiresAt,
            nonce: payload.nonce,
            sessionId: uuid().replace(/-/gi, ""),
            matchId: uuid().replace(/-/gi, ""),
            region,
            userAgent: c.req.header("User-Agent"),
            playlist,
          }),
          config.client_secret,
        ),
      });
    },
  );
}
