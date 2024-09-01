import { ActivityType, type Client } from "discord.js";
import { logger } from "../..";

export default class ReadyEvent {
  name = "ready";
  once = false;

  execute(client: Client) {
    logger.info(`Logged in as ${client.user?.username}`);
    client.user?.setActivity({
      name: "Chronos",
      type: ActivityType.Playing,
    });
  }
}
