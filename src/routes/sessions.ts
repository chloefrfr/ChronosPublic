import { accountService, app, config, profilesService, serverService, userService } from "..";
import { Validation } from "../middleware/validation";
import { HostAPI } from "../sockets/gamesessions/host";
import { servers } from "../sockets/gamesessions/servers";
import { ServerStatus } from "../sockets/gamesessions/types";
import { XmppUtilities } from "../sockets/xmpp/utilities/XmppUtilities";
import { Profiles } from "../tables/profiles";
import errors from "../utilities/errors";
import { LevelsManager } from "../utilities/managers/LevelsManager";
import { RewardsManager } from "../utilities/managers/RewardsManager";
import ProfileHelper from "../utilities/profiles";
import { v4 as uuid } from "uuid";

export default function () {
  app.post("/gamesessions/create", Validation.verifyBasicToken, async (c) => {
    let body;
    const timestamp = new Date().toISOString();

    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON", timestamp), 400);
    }

    const { sessionId, status, version, port, identifier, address, options } = body;

    const parsedVersion = parseInt(version, 10);
    const parsedPort = parseInt(port, 10);

    if (isNaN(parsedVersion) || isNaN(parsedPort))
      return c.json(
        errors.createError(400, c.req.url, "Version or Port must be valid numbers.", timestamp),
        400,
      );

    try {
      const server = await serverService.create({
        sessionId,
        status,
        version,
        identifier,
        address,
        port,
        options,
      });
      return c.json(server);
    } catch (error) {
      return c.json(errors.createError(500, c.req.url, "Failed to create server.", timestamp), 500);
    }
  });

  app.get("/gamesessions/list", Validation.verifyBasicToken, async (c) => {
    const timestamp = new Date().toISOString();

    try {
      const servers = await serverService.listServers();
      return c.json(servers);
    } catch (error) {
      return c.json(errors.createError(500, c.req.url, "Failed to list servers.", timestamp), 500);
    }
  });

  app.get("/gamesessions/list/:sessionId", Validation.verifyBasicToken, async (c) => {
    let body;
    const timestamp = new Date().toISOString();

    const sessionId = c.req.param("sessionId");

    try {
      const server = await serverService.getServerBySessionId(sessionId);
      if (!server)
        return c.json(errors.createError(404, c.req.url, "Server not found.", timestamp), 404);

      return c.json(server);
    } catch (error) {
      return c.json(errors.createError(500, c.req.url, "Failed to list servers.", timestamp), 500);
    }
  });

  app.post("/gamesessions/setStatus", Validation.verifyBasicToken, async (c) => {
    let body;
    const timestamp = new Date().toISOString();

    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON", timestamp), 400);
    }

    const { status, sessionId } = body;

    try {
      const server = await serverService.getServerBySessionId(sessionId);
      const existingServers = servers.find((s) => s.sessionId === sessionId);

      if (!existingServers || !server)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Failed to set server status to '${status}'`,
            timestamp,
          ),
          400,
        );

      existingServers.status = status;
      await serverService.setServerStatus(server.sessionId, status);

      return c.json({ message: `Successfully set server status to '${status}'` });
    } catch (error) {
      return c.json(
        errors.createError(500, c.req.url, "Failed to set server status.", timestamp),
        500,
      );
    }
  });

  app.post(
    "/gamesessions/stats/vbucks/:username/:sessionId/:eliminations",
    Validation.verifyBasicToken,
    async (c) => {
      const sessionId = c.req.param("sessionId");
      const username = c.req.param("username");
      const session = await HostAPI.getServerBySessionId(sessionId);
      const timestamp = new Date().toISOString();

      const [user] = await Promise.all([userService.findUserByUsername(username)]);

      if (!user)
        return c.json(errors.createError(404, c.req.url, "User not found!", timestamp), 404);

      const [common_core] = await Promise.all([
        ProfileHelper.getProfile(user.accountId, "common_core"),
      ]);

      if (!session)
        return c.json(errors.createError(404, c.req.url, "Session not found!", timestamp), 404);

      if (!common_core)
        return c.json(
          errors.createError(404, c.req.url, "Profile 'common_core' was not found!", timestamp),
          404,
        );

      let body;

      try {
        body = await c.req.json();
      } catch (error) {
        return c.json(errors.createError(400, c.req.url, "Body isn't Valid JSON!", timestamp), 400);
      }

      const { isVictory } = await c.req.json();

      try {
        const eliminations = parseInt(c.req.param("eliminations"));

        let currency = eliminations * 50;
        if (isVictory) currency += 200;

        common_core.items["Currency:MtxPurchased"].quantity += currency;

        await Promise.all([
          Profiles.createQueryBuilder()
            .update()
            .set({ profile: common_core })
            .where("type = :type", { type: "common_core" })
            .andWhere("accountId = :accountId", { accountId: user.accountId })
            .execute(),
        ]);

        return c.json({ message: "Success!" });
      } catch (error) {
        return c.json({ error: `Internal Server Error: ${error}` }, 500);
      }
    },
  );

  app.post(
    "/gamesessions/levels/:username/:sessionId/:totalXp",
    Validation.verifyBasicToken,
    async (c) => {
      const sessionId = c.req.param("sessionId");
      const username = c.req.param("username");
      // const session = await HostAPI.getServerBySessionId(sessionId);
      const timestamp = new Date().toISOString();

      // if (!session)
      //   return c.json(errors.createError(404, c.req.url, "Session not found!", timestamp), 404);

      try {
        const user = await userService.findUserByUsername(username);
        if (!user) {
          return c.json(errors.createError(404, c.req.url, "User not found!", timestamp), 404);
        }

        const athena = await ProfileHelper.getProfile(user.accountId, "athena");
        if (!athena) {
          return c.json(
            errors.createError(404, c.req.url, "Profile 'athena' was not found!", timestamp),
            404,
          );
        }

        const common_core = await ProfileHelper.getProfile(user.accountId, "common_core");
        if (!common_core) {
          return c.json(
            errors.createError(404, c.req.url, "Profile 'common_core' was not found!", timestamp),
            404,
          );
        }

        const totalXp = parseInt(c.req.param("totalXp"));
        const { attributes } = athena.stats;

        for (const pastSeason of attributes.past_seasons) {
          if (pastSeason.seasonNumber === config.currentSeason) {
            pastSeason.seasonXp += totalXp;

            if (isNaN(attributes.level)) attributes.level = 1;
            if (isNaN(attributes.xp)) attributes.xp = 0;

            const updater = await RewardsManager.addGrant(pastSeason);
            const lootList: { itemType: string; itemGuid: string; quantity: number }[] = [];

            if (!updater) continue;

            console.log(updater.items);
            console.log(updater.canGrantItems);

            // so unproper but idc, it works
            updater.items.forEach((val) => {
              switch (val.type) {
                case "athena":
                  athena.items[val.templateId] = {
                    templateId: val.templateId,
                    attributes: val.attributes,
                    quantity: val.quantity,
                  };
                  break;
                case "common_core":
                  if (val.templateId.includes("Currency")) {
                    let found = false;
                    for (const itemId in common_core.items) {
                      if (common_core.items[itemId].templateId === val.templateId) {
                        common_core.items[itemId].quantity += val.quantity;
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      common_core.items[val.templateId] = {
                        templateId: val.templateId,
                        attributes: val.attributes,
                        quantity: val.quantity,
                      };
                    }
                  } else {
                    common_core.items[val.templateId] = {
                      templateId: val.templateId,
                      attributes: val.attributes,
                      quantity: val.quantity,
                    };
                  }
                  break;

                case "athenaseasonxpboost":
                  attributes.season_match_boost =
                    (attributes.season_match_boost || 0) + val.quantity;
                  break;
                case "athenaseasonfriendxpboost":
                  attributes.season_friend_match_boost =
                    (attributes.season_friend_match_boost || 0) + val.quantity;
                  break;
              }

              lootList.push({
                itemType: val.templateId,
                itemGuid: val.templateId,
                quantity: val.quantity,
              });
            });

            if (updater.canGrantItems) {
              common_core.stats.attributes.gifts.push({
                templateId: "GiftBox:gb_battlepass",
                attributes: {
                  lootList,
                },
                quantity: 1,
              });

              XmppUtilities.SendMessageToId(
                JSON.stringify({
                  payload: {},
                  type: "com.epicgames.gift.received",
                  timestamp: new Date().toISOString(),
                }),
                user.accountId,
              );
            }

            attributes.level = updater.pastSeasons.seasonLevel;
            attributes.book_level = updater.pastSeasons.bookLevel;
            attributes.xp += updater.pastSeasons.seasonXp;
          }
        }

        await Profiles.createQueryBuilder()
          .update()
          .set({ profile: athena })
          .where("type = :type", { type: "athena" })
          .andWhere("accountId = :accountId", { accountId: user.accountId })
          .execute();

        await Profiles.createQueryBuilder()
          .update()
          .set({ profile: common_core })
          .where("type = :type", { type: "common_core" })
          .andWhere("accountId = :accountId", { accountId: user.accountId })
          .execute();

        return c.json({ message: "Success!" });
      } catch (error) {
        return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
      }
    },
  );
}
