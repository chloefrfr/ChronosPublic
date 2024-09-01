import { accountService, app, userService } from "..";
import { Validation } from "../middleware/validation";
import path from "node:path";
import errors from "../utilities/errors";

export default function () {
  app.get("/fortnite/api/game/v2/world/info", Validation.verifyToken, async (c) => {
    const content = await Bun.file(
      path.join(__dirname, "..", "memory", "world", "worldinfo.json"),
    ).json();

    return c.json(content);
  });

  app.get(
    "/fortnite/api/receipts/v1/account/:accountId/receipts",
    Validation.verifyPermissions,
    async (c) => {
      const accountId = c.req.param("accountId");
      const timestamp = new Date().toISOString();

      const user = await userService.findUserByAccountId(accountId);
      const account = await accountService.findUserByAccountId(accountId);

      if (!user || !account) {
        return c.json(
          errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
          404,
        );
      }

      const permissions = c.get("permission");

      const hasPermission = permissions.hasPermission(
        `fortnite:profile:${user.accountId}:receipts`,
        "*",
      );

      if (!hasPermission)
        return c.json(
          errors.createError(
            401,
            c.req.url,
            permissions.errorReturn(`fortnite:profile:${user.accountId}:receipts`, "*"),
            timestamp,
          ),
          401,
        );

      return c.json(account.receipts);
    },
  );
}
