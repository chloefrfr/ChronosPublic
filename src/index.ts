import { Hono } from "hono";
import Config from "./wrappers/Env.wrapper";
import Logger, { LogLevel } from "./utilities/logging";
import Database from "./wrappers/Database.wrapper";
import UserService from "./wrappers/database/UserService";
import { loadRoutes } from "./utilities/routing";
import path from "node:path";
import AccountService from "./wrappers/database/AccountService";
import TokensService from "./wrappers/database/TokensService";
import { ShopGenerator } from "./shop/shop";
import { ShopHelper } from "./shop/helpers/shophelper";
import rotate from "./shop/rotate/autorotate";
import ProfilesService from "./wrappers/database/ProfilesService";

export const app = new Hono({ strict: false });
export const logger = new Logger(LogLevel.DEBUG);
export const config = new Config().getConfig();

app.use(async (c, next) => {
  await next();

  logger.info(`${c.req.url} | ${c.req.method} | ${c.res.status}`);
});

export const db = new Database({
  connectionString: config.databaseUrl,
});

db.connect();

export const userService = new UserService(db);
export const accountService = new AccountService(db);
export const tokensService = new TokensService(db);
export const profilesService = new ProfilesService(db);

await loadRoutes(path.join(__dirname, "routes"), app);

import("./bot/deployment");
import("./bot/bot");

await rotate(false);

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

logger.startup(`Chronos running on port ${config.port}`);
