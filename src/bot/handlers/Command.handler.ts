import {
  Collection,
  type CacheType,
  type Client,
  type CommandInteraction,
  type Interaction,
} from "discord.js";
import fs from "node:fs/promises";
import { join } from "node:path";

import type { Command, ExtendedClient } from "../interfaces/ExtendedClient";
import { logger } from "../..";

export default async function CommandHandler(client: ExtendedClient) {
  const commandsDir = await fs.readdir(join(__dirname, "..", "commands"));
  const commands = commandsDir.filter((cmd) => cmd.endsWith(".ts"));

  const commandData = await Promise.all(
    commands.map(async (cmd) => {
      const { default: CommandClass } = await import(`../commands/${cmd}`);
      const CommandInstance = new CommandClass();

      client.commands.set(CommandInstance.data.name, CommandInstance);

      return CommandInstance.data;
    }),
  );

  client.on("interactionCreate" as any, async (interaction: CommandInteraction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
      await command.execute(interaction, {});
    } catch (error) {
      await interaction.reply("There was an error executing that command!");
    }
  });
}
