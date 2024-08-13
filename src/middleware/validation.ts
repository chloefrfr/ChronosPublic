import type { Context, Next } from "hono";
import errors from "../utilities/errors";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { accountService, config, tokensService, userService } from "..";
import PermissionInfo from "../utilities/permissions/permissioninfo";
import type { GrantType } from "../../types/permissionsdefs";

export namespace Validation {
  export async function verifyToken(c: Context, next: Next) {
    const Authorization = c.req.header("Authorization");
    const originalUrl = c.req.url;

    const timestamp = new Date().toISOString();

    const servicePath = originalUrl.split("/")[1];
    const requestService: string | undefined = ["account", "com.epicgames.account.public"].includes(
      servicePath,
    )
      ? undefined
      : servicePath;

    if (
      !Authorization ||
      !(Authorization.startsWith("bearer ") || Authorization.startsWith("bearer eg1~"))
    )
      return c.json(errors.createError(400, originalUrl, "Invalid Token", timestamp), 400);

    try {
      const token = Authorization.replace("bearer eg1~", "");
      const decodedToken = jwt.verify(token, config.client_secret);

      if (!decodedToken)
        return c.json(errors.createError(400, originalUrl, "Invalid Token", timestamp), 400);

      const [user, account] = await Promise.all([
        userService.findUserByAccountId(decodedToken.sub as string),
        accountService.findUserByAccountId(decodedToken.sub as string),
      ]);

      if (!user || !account)
        return c.json(errors.createError(404, originalUrl, "Failed to find user.", timestamp), 404);

      if (user.banned)
        return c.json(errors.createError(403, c.req.url, "This user is banned.", timestamp), 403);

      /// TODO - Check if the useragent is valid.

      c.set("user", user);
      c.set("account", account);

      await next();
    } catch (error) {
      const isTokenError = error instanceof JsonWebTokenError;

      const errorMessage = isTokenError
        ? "Sorry, we couldn't validate your token. Please try again with a new token."
        : `Authentication failed for ${originalUrl.replace("/account", "")}`;

      const messageVars = isTokenError ? null : originalUrl.replace("/account", "");

      return c.json(errors.createError(401, messageVars, errorMessage, timestamp), 401);
    }
  }

  export async function verifyBasicToken(c: Context, next: Next) {
    const authorizationHeader = c.req.header("Authorization");
    const timestamp = new Date().toISOString();

    if (!authorizationHeader || !authorizationHeader.startsWith("Basic "))
      return c.json(errors.createError(403, c.req.url, "Unauthorized", timestamp), 403);

    const token = authorizationHeader.split(" ")[1];

    if (token !== config.token)
      return c.json(errors.createError(403, c.req.url, "Token not valid!", timestamp), 403);

    await next();
  }

  export async function verifyPermissions(c: Context, next: Next) {
    const authorization = c.req.header("Authorization");
    const timestamp = new Date().toISOString();

    if (
      !authorization ||
      !(authorization.startsWith("bearer ") || authorization.startsWith("bearer eg1~"))
    )
      return c.json(errors.createError(400, c.req.url, "Invalid Header", timestamp), 400);

    const accessToken = await tokensService.getToken(authorization.replace("bearer eg1~", ""));

    if (!accessToken)
      return c.json(errors.createError(400, c.req.url, "Invalid Token", timestamp), 400);

    const user = await userService.findUserByAccountId(accessToken.accountId);

    if (!user)
      return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

    if (user.banned)
      return c.json(errors.createError(403, c.req.url, "This user is banned.", timestamp), 403);

    const grantMap: { [key: string]: GrantType } = {
      client_credentials: "client_credentials",
      authorization_code: "authorization_code",
      refresh_token: "refresh_token",
    };

    c.set(
      "permission",
      new PermissionInfo(
        user.accountId,
        user.username,
        "3446cd72694c4a4485d81b77adbb2141",
        grantMap[accessToken.grant],
      ),
    );

    await next();
  }
}
