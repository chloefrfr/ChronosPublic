import { Client, Collection, GatewayIntentBits } from "discord.js";
import { config } from "..";
import type { ExtendedClient } from "./interfaces/ExtendedClient";
import type BaseCommand from "./base/Base";
import EventHandler from "./handlers/Event.handler";
import CommandHandler from "./handlers/Command.handler";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

client.commands = new Collection<string, BaseCommand>();

await EventHandler(client);
await CommandHandler(client);

client.login(config.bot_token);
