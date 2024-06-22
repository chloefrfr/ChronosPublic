import { app, logger, userService } from "..";
import { loadOperations } from "../utilities/routing";
import MCPResponses, { type ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import { Validation } from "../middleware/validation";

const operations = await loadOperations();

export default function () {
  app.post(
    "/fortnite/api/game/v2/profile/:accountId/client/:action",
    // Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const action = c.req.param("action");
      const rvn = c.req.query("rvn");
      const profileId = c.req.query("profileId") as ProfileId;
      const timestamp = new Date().toISOString();

      if (!action)
        return c.json(
          errors.createError(400, c.req.url, "Missing parameter 'action'", timestamp),
          400,
        );

      if (!accountId || !rvn || !profileId)
        return c.json(
          errors.createError(400, c.req.url, "Missing query parameters.", timestamp),
          400,
        );

      const user = await userService.findUserByAccountId(accountId);

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

      const profile = await ProfileHelper.getProfile(profileId);

      if (!profile && profileId !== "athena" && profileId !== "common_core")
        return c.json(MCPResponses.generate({ rvn }, [], profileId));

      logger.debug(`Requested action '${action}' with the profileId ${profileId}`);

      const handler = operations[action];

      if (handler && typeof handler === "function") return await handler(c);

      return c.json(MCPResponses.generate(profile, [], profileId));
    },
  );
}
