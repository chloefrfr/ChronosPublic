import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "..";

dotenv.config();

type ConfigType = z.infer<typeof configSchema>;

const configSchema = z.object({
  port: z.number(),
  databaseUrl: z.string(),
  bot_token: z.string(),
  guild_id: z.string(),
  client_secret: z.string(),
  currentSeason: z.number(),
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
