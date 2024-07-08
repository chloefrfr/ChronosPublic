import { app, logger, userService } from "..";
import { loadOperations } from "../utilities/routing";
import MCPResponses, { type ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import { Validation } from "../middleware/validation";
import EmptyGift from "../externalOperations/EmptyGift";
import uaparser from "../utilities/uaparser";

const operations = await loadOperations();

export default function () {
  app.post("/fortnite/profile/:accountId/client/emptygift", async (c) => {
    return await EmptyGift(c);
  });

  app.post(
    "/fortnite/api/game/v2/profile/:accountId/dedicated_server/:action",
    Validation.verifyToken,
    async (c) => {
      const accountId = c.req.param("accountId");
      const action = c.req.param("action");
      const rvn = c.req.query("rvn");
      const profileId = c.req.query("profileId") as ProfileId;
      const timestamp = new Date().toISOString();
      const useragent = c.req.header("User-Agent");

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

      if (!useragent)
        return c.json(
          errors.createError(400, c.req.url, "Missing header 'User-Agent'", timestamp),
          400,
        );

      const uahelper = uaparser(useragent);
      if (!uahelper)
        return c.json(
          errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
          400,
        );

      const user = await userService.findUserByAccountId(accountId);

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

      const profile = await ProfileHelper.getProfile(user.accountId, profileId);

      if (!profile && profileId !== "athena" && profileId !== "common_core")
        return c.json(MCPResponses.generate({ rvn }, [], profileId));

      let applyProfileChanges: object[] = [];

      const profileRevision =
        uahelper!.buildUpdate >= "12.20" ? profile.commandRevision : profile.rvn;
      const queryRevision = c.req.query("rvn") || 0;

      if (queryRevision !== profileRevision) {
        applyProfileChanges = [
          {
            changeType: "fullProfileUpdate",
            profile,
          },
        ];
      }

      return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
    },
  );

  app.post(
    "/fortnite/api/game/v2/profile/:accountId/client/:action",
    Validation.verifyToken,
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

      const profile = await ProfileHelper.getProfile(user.accountId, profileId);

      if (!profile && profileId !== "athena" && profileId !== "common_core")
        return c.json(MCPResponses.generate({ rvn }, [], profileId));

      const handler = operations[action];

      if (handler && typeof handler === "function") return await handler(c);

      logger.warn(`Missing Action: ${action}`);

      return c.json(MCPResponses.generate(profile, [], profileId));
    },
  );
}
