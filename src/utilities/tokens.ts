import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { config, tokensService } from "..";
import type { User } from "../tables/user";

export interface TokenPayload {
  app: string;
  sub: string;
  dvid: number;
  mver: boolean;
  clid: string;
  dn: string;
  am: string;
  p: string;
  iai: string;
  sec: number;
  clsvc: string;
  t: string;
  ic: boolean;
  jti: string;
  creation_date: string;
  expires_in: number;
}

export default class TokenUtilities {
  private static async createToken(
    clientId: string,
    grantType: string,
    user: User,
    type: "access" | "refresh",
  ): Promise<string> {
    const payload: TokenPayload = {
      app: "fortnite",
      sub: user.accountId,
      dvid: Math.floor(Math.random() * 1e9),
      mver: false,
      clid: clientId,
      dn: user.username,
      am: type === "access" ? grantType : "refresh",
      p: Buffer.from(uuid()).toString("base64"),
      iai: user.accountId,
      sec: 1,
      clsvc: "fortnite",
      t: "s",
      ic: true,
      jti: uuid(),
      creation_date: new Date().toISOString(),
      expires_in: 1,
    };

    const expiresIn = type === "access" ? 4 * 3600 : 14 * 24 * 3600;
    const token = jwt.sign(payload, config.client_secret, { expiresIn });

    await tokensService.create({
      id: uuid(),
      type: type + "token",
      accountId: user.accountId,
      token,
    });

    return token;
  }

  static async createAccessToken(clientId: string, grantType: string, user: User): Promise<string> {
    return this.createToken(clientId, grantType, user, "access");
  }

  static async createRefreshToken(clientId: string, user: User): Promise<string> {
    return this.createToken(clientId, "", user, "refresh");
  }
}
