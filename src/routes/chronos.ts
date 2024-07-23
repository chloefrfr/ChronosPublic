import axios from "axios";
import { app, config, logger, userService } from "..";
import errors from "../utilities/errors";
import jwt, { decode, type JwtPayload } from "jsonwebtoken";
import { Encryption } from "../utilities/encryption";

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

      let currentRole: string = "";
      for (const role of user.roles) {
        console.log(role);
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

      console.log(currentRole);

      const newToken = Encryption.encrypt(
        JSON.stringify({
          username: user.username,
          accountId: user.accountId,
          avatar: userData.avatar,
          roles: currentRole,
          userId: userData.id,
        }),
        config.client_secret,
      );

      return c.redirect(`chronos://auth:${newToken}`);
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
        discordId: payload.userId,
        avatar: `https://cdn.discordapp.com/avatars/${payload.userId}/${payload.avatar}.png`,
        roles: payload.roles,
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
}
