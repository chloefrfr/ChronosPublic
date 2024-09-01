import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

type ConfigType = z.infer<typeof configSchema>;

const configSchema = z.object({
  port: z.number(),
  databaseUrl: z.string(),
  bot_token: z.string(),
  guild_id: z.string(),
  client_secret: z.string(),
  currentSeason: z.number(),
  webhook_url: z.string(),
  session_url: z.string(),
  token: z.string(),
  drop: z.boolean(),
  discord_client_id: z.string(),
  discord_client_secret: z.string(),
  tcp: z.boolean(),
});

export default class Config {
  private config: ConfigType;

  constructor() {
    const parsedConfig = configSchema.safeParse({
      port: parseInt(Bun.env.port as string, 10),
      databaseUrl: Bun.env.databaseUrl,
      bot_token: Bun.env.bot_token,
      guild_id: Bun.env.guild_id,
      client_secret: Bun.env.client_secret,
      currentSeason: parseInt(Bun.env.currentSeason as string, 10),
      webhook_url: Bun.env.webhook_url,
      session_url: Bun.env.session_url,
      token: Bun.env.token,
      drop: Bun.env.drop === "true" || Bun.env.drop === undefined ? true : false,
      discord_client_id: Bun.env.discord_client_id,
      discord_client_secret: Bun.env.discord_client_secret,
      tcp: Bun.env.tcp === "true" || Bun.env.tcp === undefined ? true : false,
    });

    // Check if parsing was successful
    if (!parsedConfig.success)
      throw new Error(parsedConfig.error.errors.map((err) => err.message).join("\n"));

    this.config = parsedConfig.data;
  }

  public getConfig(): ConfigType {
    // logger.info("Config registered:", this.config);

    return this.config;
  }
}
