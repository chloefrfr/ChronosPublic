import { app, userService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";

export default function () {
  app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/:accountId", async (c) => {
    c.header("Content-Type", "text/plain");
    return c.text("true");
  });

  app.get("/account/api/public/account/:accountId/externalAuths", async (c) => {
    return c.json([]);
  });

  app.get("/fortnite/api/game/v2/enabled_features", async (c) => {
    return c.json([]);
  });

  app.get("/account/api/public/account/:accountId", Validation.verifyToken, async (c) => {
    const accountId = c.req.param("accountId");
    const user = await userService.findUserByAccountId(accountId);
    const timestamp = new Date().toISOString();

    if (!user)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    if (user.banned)
      return c.json(errors.createError(403, c.req.url, "This user is banned.", timestamp), 403);

    return c.json({
      id: user.accountId,
      displayName: user.username,
      name: user.username,
      email: `${user.email}@PROTECTION-staging.chronos.dev`,
      failedLoginAttempts: 0,
      lastLogin: timestamp,
      numberOfDisplayNameChanges: 0,
      ageGroup: "UNKNOWN",
      headless: false,
      country: "US",
      lastName: "User",
      links: {},
      preferredLanguage: "en",
      canUpdateDisplayName: false,
      tfaEnabled: true,
      emailVerified: true,
      minorVerified: true,
      minorExpected: true,
      minorStatus: "UNKNOWN",
    });
  });

  app.get("/account/api/public/account", Validation.verifyToken, async (c) => {
    const accountIdQuery = c.req.query("accountId");
    const timestamp = new Date().toISOString();

    if (!accountIdQuery)
      return c.json(
        errors.createError(400, c.req.url, "Parameter 'accountId' is missing.", timestamp),
        400,
      );

    const response: any[] = [];

    if (accountIdQuery!.includes(",")) {
      const accountIds: string[] = accountIdQuery.split(",");

      for (const accountId of accountIds) {
        const user = await userService.findUserByAccountId(accountId);

        if (!user)
          return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

        response.push({
          id: user.accountId,
          displayName: user.username,
          externalAuth: {},
        });
      }
    } else {
      const user = await userService.findUserByAccountId(accountIdQuery);

      if (!user)
        return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

      response.push({
        id: user.accountId,
        links: {},
        displayName: user.username,
        cabinedMode: false,
        externalAuth: {},
      });
    }

    return c.json(response);
  });
}
