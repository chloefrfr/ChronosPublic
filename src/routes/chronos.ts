import axios from "axios";
import { app, config, logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import jwt, { decode, type JwtPayload } from "jsonwebtoken";
import { Encryption } from "../utilities/encryption";
import { XmppService } from "../sockets/xmpp/saved/XmppServices";
import path from "node:path";
import { servers } from "../sockets/matchmaker/server";

enum ARoles {
  None = "None",
  Members = "Members",
  Trusted = "Trusted",
  Donator = "Donator",
  ContentCreator = "Content Creator",
  SocialMediaManager = "Social Media Manager",
  Moderator = "Moderator",
  Admin = "Admin",
  ServerManager = "Server Manager",
  Contributor = "Contributor",
  LauncherDeveloper = "Developer",
  BackendDeveloper = "Developer",
  GameserverDeveloper = "Developer",
  CoOwner = "Co Owner",
  Owner = "Owner",
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
}

interface TokenPayload {
  accountId: string;
  username: string;
  avatar: string;
  roles: string;
  userId: string;
  profile: ProfileData;
}

interface ProfileData {
  athena: AthenaProfile;
  common_core: CommonCoreProfile;
}

interface AthenaProfile {
  currentCharacter: string;
  seasonLevel: number;
  seasonXp: number;
  bookPurchased: boolean;
  bookLevel: number;
  bookXp: number;
}

interface CommonCoreProfile {
  vbucks: number;
}

interface LauncherNews {
  date: string;
  title: string;
  description: string;
  image: string;
}

export default function () {
  app.get("/chronos/discord", async (c) => {
    const code = c.req.query("code");
    const timestamp = new Date().toISOString();

    if (!code)
      return c.body(
        `https://discord.com/oauth2/authorize?client_id=${
          config.discord_client_id
        }&response_type=code&redirect_uri=${encodeURIComponent(
          `http://localhost:${config.port}/chronos/discord`,
        )}&scope=identify`,
      );

    const params = new URLSearchParams();
    params.append("client_id", config.discord_client_id);
    params.append("client_secret", config.discord_client_secret);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", `http://localhost:${config.port}/chronos/discord`);
    params.append("scope", "identify");

    try {
      const tokenResponse = await axios.post("https://discord.com/api/v10/oauth2/token", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (tokenResponse.status !== 200) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find Discord user.", timestamp),
          400,
        );
      }

      const accessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get<DiscordUser>("https://discord.com/api/v10/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (userResponse.status !== 200) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to get Discord user information.", timestamp),
          400,
        );
      }

      const userData = userResponse.data;

      const user = await userService.findUserByDiscordId(userData.id);

      if (!user) {
        return c.json(errors.createError(400, c.req.url, "Failed to find user.", timestamp), 400);
      }

      const profile = await profilesService.findByAccountId(user.accountId);
      if (!profile) {
        return c.json(
          errors.createError(400, c.req.url, "Failed to find profile.", timestamp),
          400,
        );
      }

      let currentRole: string = "";
      for (const role of user.roles) {
        switch (role) {
          case ARoles.Members:
          case ARoles.Trusted:
          case ARoles.Donator:
          case ARoles.ContentCreator:
          case ARoles.SocialMediaManager:
          case ARoles.Moderator:
          case ARoles.Admin:
          case ARoles.ServerManager:
          case ARoles.Contributor:
          case ARoles.LauncherDeveloper:
          case ARoles.BackendDeveloper:
          case ARoles.GameserverDeveloper:
          case ARoles.CoOwner:
          case ARoles.Owner:
            currentRole = role;
            break;
          default:
            break;
        }
      }

      const { athena, common_core } = profile;

      const favorite_character = athena.stats.attributes.favorite_character?.replace(
        "AthenaCharacter:",
        "",
      );

      const currentSkin = await axios
        .get(`https://fortnite-api.com/v2/cosmetics/br/${favorite_character}`)
        .then((res) => res.data.data);

      const ProfileAthena = {
        currentCharacter:
          currentSkin.images.icon ??
          "https://fortnite-api.com/images/cosmetics/br/cid_001_athena_commando_f_default/icon.png",
        seasonLevel: athena.stats.attributes.level ?? 1,
        seasonXp: athena.stats.attributes.xp ?? 0,
        bookPurchased: athena.stats.attributes.book_purchased ?? false,
        bookLevel: athena.stats.attributes.book_level ?? 0,
        bookXp: athena.stats.attributes.book_xp ?? 0,
      };

      const ProfileCommonCore = {
        vbucks: common_core.items["Currency:MtxPurchased"].quantity ?? 0,
      };

      const newToken = Encryption.encrypt(
        JSON.stringify({
          username: user.username,
          accountId: user.accountId,
          avatar: userData.avatar,
          roles: currentRole,
          userId: userData.id,
          profile: {
            athena: ProfileAthena,
            common_core: ProfileCommonCore,
          },
        }),
        config.client_secret,
      );

      return c.redirect(`demeter://auth:${newToken}`);
    } catch (error) {
      logger.error(`Failed to get discord user: ${error}`);
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
    }
  });

  app.post("/chronos/getPlayerData", async (c) => {
    const { token } = await c.req.json();
    const timestamp = new Date().toISOString();

    if (!token) {
      return c.json(
        errors.createError(400, c.req.url, "Missing body parameter 'token'", timestamp),
        400,
      );
    }

    try {
      const decodedToken = Encryption.decrypt(token, config.client_secret);

      if (!decodedToken) {
        return c.json(errors.createError(400, c.req.url, "Invalid Token.", timestamp), 400);
      }

      let payload: TokenPayload;
      try {
        payload = JSON.parse(decodedToken);
      } catch (error) {
        return c.json(errors.createError(400, c.req.url, "Invalid Payload.", timestamp), 400);
      }

      return c.json({
        accountId: payload.accountId,
        username: payload.username,
        discordId: payload.userId,
        avatar: `https://cdn.discordapp.com/avatars/${payload.userId}/${payload.avatar}.png`,
        roles: payload.roles,
        profile: payload.profile,
      });
    } catch (error) {
      logger.error(`Failed to verify token: ${error}`);

      return c.json(errors.createError(400, c.req.url, "Invalid token.", timestamp), 400);
    }
  });

  app.get("/chronos/getroles/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const timestamp = new Date().toISOString();

    if (!accountId) {
      return c.json(
        errors.createError(400, c.req.url, "Missing parameter 'accountId'", timestamp),
        400,
      );
    }

    try {
      const user = await userService.findUserByAccountId(accountId);
      if (!user) {
        return c.json(
          errors.createError(
            404,
            c.req.url,
            `User with the accountId '${accountId}' does not exist.`,
            timestamp,
          ),
          404,
        );
      }

      const roles = user.roles as (keyof typeof ARoles)[];

      const filteredRoles = roles.filter((role) => role !== null && role !== undefined);
      const roleNames = filteredRoles.map((role) => ARoles[role]);
      const filteredRoleNames = roleNames.filter((roleName) => roleName !== null);

      return c.json(filteredRoleNames);
    } catch (error) {
      logger.error(`Failed to get user roles: ${error}`);
      return c.json(errors.createError(400, c.req.url, "Invalid user.", timestamp), 400);
    }
  });

  app.get("/chronos/server/data/:type", async (c) => {
    const type = c.req.param("type");

    switch (type) {
      case "parties":
        return c.json(XmppService.parties);
      case "pings":
        return c.json(XmppService.pings);
      case "clients":
        return c.json(XmppService.clients);
      case "mucs":
        return c.json(XmppService.xmppMucs);
      case "servers":
        return c.json(servers);
    }
  });

  app.post("/chronos/interval/getNewProfileData", async (c) => {
    const { accountId } = await c.req.json();
    const timestamp = new Date().toISOString();

    if (!accountId) {
      return c.json(
        errors.createError(400, c.req.url, "Missing body parameter 'accountId'", timestamp),
        400,
      );
    }

    const profile = await profilesService.findByAccountId(accountId);
    if (!profile) {
      return c.json(errors.createError(400, c.req.url, "Failed to find profile.", timestamp), 400);
    }

    try {
      const { athena, common_core } = profile;

      const favorite_character = athena.stats.attributes.favorite_character?.replace(
        "AthenaCharacter:",
        "",
      );

      const currentSkin = await axios
        .get(`https://fortnite-api.com/v2/cosmetics/br/${favorite_character}`)
        .then((res) => res.data.data);

      const ProfileAthena = {
        currentCharacter:
          currentSkin.images.icon ??
          "https://fortnite-api.com/images/cosmetics/br/cid_001_athena_commando_f_default/icon.png",
        seasonLevel: athena.stats.attributes.level ?? 1,
        seasonXp: athena.stats.attributes.xp ?? 0,
        bookPurchased: athena.stats.attributes.book_purchased ?? false,
        bookLevel: athena.stats.attributes.book_level ?? 0,
        bookXp: athena.stats.attributes.book_xp ?? 0,
      };

      const ProfileCommonCore = {
        vbucks: common_core.items["Currency:MtxPurchased"].quantity ?? 0,
      };

      return c.json({
        profile: {
          athena: ProfileAthena,
          common_core: ProfileCommonCore,
        },
      });
    } catch (error) {
      logger.error(`Failed to get new profile data: ${error}`);

      return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp), 500);
    }
  });

  app.get("/chronos/launcher/news", async (c) => {
    const news = (await Bun.file(
      path.join(__dirname, "..", "..", "static", "LauncherNews.json"),
    ).json()) as LauncherNews[];

    const timestamp = new Date().toISOString();

    if (!news) {
      return c.json(errors.createError(400, c.req.url, "Failed to parse file.", timestamp), 400);
    }

    try {
      return c.json(news);
    } catch (error) {
      return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
    }
  });
}
