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
import fetch from "node-fetch";
import HypeService from "./wrappers/database/HypeService";
import FriendsService from "./wrappers/database/FriendsService";
import { ItemStorageService } from "./wrappers/database/ItemStorageService";
import { DiscordWebhook } from "./utilities/webhook";
import type { User } from "./tables/user";
import type { Account } from "./tables/account";
import { ServerService } from "./wrappers/database/ServerService";
import { QuestManager } from "./utilities/managers/QuestManager";
import { LevelsManager } from "./utilities/managers/LevelsManager";
import DailyQuestService from "./wrappers/database/DailyQuestService";
import BattlepassQuestService from "./wrappers/database/BattlepassQuestService";

export type Variables = {
  user: User;
  account: Account;
};

export const app = new Hono<{ Variables: Variables }>({ strict: false });
export const logger = new Logger(LogLevel.DEBUG);
export const config = new Config().getConfig();

app.use(async (c, next) => {
  await next();

  // logger.info(`${c.req.url} | ${c.req.method} | ${c.res.status}`);
});

export const db = new Database({
  connectionString: config.databaseUrl,
});

await db.connect();

export const userService = new UserService(db);
export const accountService = new AccountService(db);
export const tokensService = new TokensService(db);
export const profilesService = new ProfilesService(db);
export const hypeService = new HypeService(db);
export const friendsService = new FriendsService(db);
export const itemStorageService = new ItemStorageService(db);
export const serverService = new ServerService(db);
export const dailyQuestService = new DailyQuestService(db);
export const battlepassQuestService = new BattlepassQuestService(db);

await loadRoutes(path.join(__dirname, "routes"), app);

import("./bot/deployment");
import("./bot/bot");

import("./sockets/xmpp/server");
import("./sockets/matchmaker/server");

await rotate();
await QuestManager.initQuests();

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

logger.startup(`Chronos running on port ${config.port}`);

DiscordWebhook.SendBackendRestartWebhook();
