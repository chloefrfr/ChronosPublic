import { accountService, app, logger, profilesService, userService } from "..";
import { loadOperations } from "../utilities/routing";
import MCPResponses, { type ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import { Validation } from "../middleware/validation";
import uaparser from "../utilities/uaparser";
import type { Profiles } from "../tables/profiles";
import { handleProfileSelection } from "../operations/QueryProfile";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";

const operations = await loadOperations();

export default function () {
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

      const profile = await handleProfileSelection(profileId, user.accountId);

      if (!profile && profileId !== "athena" && profileId !== "common_core")
        return c.json(MCPResponses.generate({ rvn }, [], profileId));

      if (!profile)
        return c.json(
          errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
          404,
        );

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
    Validation.verifyPermissions,
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

      const profile = await handleProfileSelection(profileId, user.accountId);

      if (!profile && profileId !== "athena" && profileId !== "common_core")
        return c.json(MCPResponses.generate({ rvn }, [], profileId));

      if (!profile)
        return c.json(
          errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
          404,
        );

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(
        `fortnite:profile:${user.accountId}:commands`,
        "*",
      );

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`fortnite:profile:${user.accountId}:commands`, "*"),
            timestamp,
          ),
          401,
        );

      const handler = operations[action];

      if (handler && typeof handler === "function") return await handler(c);

      logger.warn(`Missing Action: ${action}`);

      return c.json(MCPResponses.generate(profile, [], profileId));
    },
  );

  app.post("/fortnite/api/game/v3/profile/:accountId/client/emptygift", async (c) => {
    const { playerName } = await c.req.json();
    const timestamp = new Date().toISOString();

    const user = await userService.findUserByUsername(playerName);

    if (!user)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    const account = await accountService.findUserByAccountId(user.accountId);

    if (!account)
      return c.json(errors.createError(404, c.req.url, "Failed to find account.", timestamp), 404);

    const athena = await handleProfileSelection("athena", user.accountId);

    if (!athena)
      return c.json(
        errors.createError(404, c.req.url, `Profile 'athena' not found.`, timestamp),
        404,
      );

    const common_core = await handleProfileSelection("common_core", user.accountId);

    if (!common_core)
      return c.json(
        errors.createError(404, c.req.url, `Profile 'common_core' not found.`, timestamp),
        404,
      );

    const uahelper = uaparser(c.req.header("User-Agent"));

    if (!uahelper)
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );

    const { receiverPlayerName } = await c.req.json();

    const receiverUser = await userService.findUserByUsername(receiverPlayerName);

    if (!receiverUser)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    const receiverAccount = await accountService.findUserByAccountId(receiverUser.accountId);

    if (!receiverAccount)
      return c.json(errors.createError(404, c.req.url, "Failed to find account.", timestamp), 404);

    athena.rvn++;
    athena.commandRevision++;
    athena.updatedAt = new Date().toISOString();

    common_core.rvn += 1;
    common_core.commandRevision += 1;
    common_core.updatedAt = new Date().toISOString();

    await profilesService.updateMultiple([
      {
        accountId: receiverAccount.accountId,
        type: "athena",
        data: athena,
      },
      {
        accountId: receiverAccount.accountId,
        type: "common_core",
        data: common_core,
      },
    ]);

    SendMessageToId(
      JSON.stringify({
        type: "com.epicgames.gift.received",
        payload: {},
        timestamp: new Date().toISOString(),
      }),
      receiverUser.accountId,
    );

    return c.json(MCPResponses.generate(common_core, [], "common_core"));
  });
}
