import fs from "node:fs/promises";
import path from "node:path";
import { Collection } from "discord.js";
import type { ExtendedClient } from "../interfaces/ExtendedClient";
import type { Command } from "../interfaces/ExtendedClient";
import { logger } from "../..";

export default async function CommandHandler(client: ExtendedClient) {
  client.commands = new Collection<string, Command>();

  const commandsDir = path.join(__dirname, "..", "commands");

  try {
    const files = await fs.readdir(commandsDir);
    const commandFiles = files.filter((file) => file.endsWith(".ts"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsDir, file);

      try {
        const { default: CommandClass } = await import(filePath);
        const commandInstance = new CommandClass();

        if (commandInstance.data && commandInstance.execute) {
          client.commands.set(commandInstance.data.name, commandInstance);
        }
      } catch (error) {
        logger.error(`Failed to import command ${file}: ${error}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to read commands directory: ${error}`);
  }

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({ content: "Unknown command", ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction, { ephemeral: true });
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}: ${error}`);
      await interaction.reply({
        content: "There was an error executing that command!",
      });
    }
  });
}
