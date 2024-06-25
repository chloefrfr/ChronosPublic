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

export const app = new Hono({ strict: false });
export const logger = new Logger(LogLevel.DEBUG);
export const config = new Config().getConfig();

app.use(async (c, next) => {
  await next();

  // logger.info(`${c.req.url} | ${c.req.method} | ${c.res.status}`);
});

export const db = new Database({
  connectionString: config.databaseUrl,
});

db.connect();

export const userService = new UserService(db);
export const accountService = new AccountService(db);
export const tokensService = new TokensService(db);
export const profilesService = new ProfilesService(db);
export const hypeService = new HypeService(db);
export const friendsService = new FriendsService(db);

await loadRoutes(path.join(__dirname, "routes"), app);

import("./bot/deployment");
import("./bot/bot");

await rotate(false);

Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

logger.startup(`Chronos running on port ${config.port}`);

const url = config.webhook_url;
const embedMessage = {
  embeds: [
    {
      title: "Our Backend Services have restarted!",
      description: "All of our services have restarted! **Please restart your game if necessary!**",
      color: 0x2db3ff,
    },
  ],
};

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(embedMessage),
})
  .then((response) => {
    if (response.ok) {
      //logger.info(''); - don't log anything for now, its fineeee!
    } else {
      logger.error("failed to send");
    }
  })
  .catch((error) => {
    logger.error("we got a fucking error!! lets gooooo", error);
  });
