import { accountService, app, profilesService, serverService, userService } from "..";
import { Validation } from "../middleware/validation";
import { HostAPI } from "../sockets/gamesessions/host";
import { servers } from "../sockets/gamesessions/servers";
import { ServerStatus } from "../sockets/gamesessions/types";
import { Profiles } from "../tables/profiles";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";

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

        console.log(common_core.items["Currency:MtxPurchased"]);

        return c.json({ message: "Success!" });
      } catch (error) {
        return c.json({ error: `Internal Server Error: ${error}` }, 500);
      }
    },
  );
}
