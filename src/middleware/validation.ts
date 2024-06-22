import type { Context, Next } from "hono";
import errors from "../utilities/errors";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { accountService, config, userService } from "..";

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
}
