import { app, serverService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";

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
      const server = await serverService.setServerStatus(sessionId, status);

      if (!server)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Failed to set server status to '${status}'`,
            timestamp,
          ),
          400,
        );

      return c.json({ message: `Successfully set server status to '${status}'` });
    } catch (error) {
      return c.json(
        errors.createError(500, c.req.url, "Failed to set server status.", timestamp),
        500,
      );
    }
  });
}
