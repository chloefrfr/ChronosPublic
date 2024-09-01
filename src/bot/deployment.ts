import { REST, Routes, type APIUser } from "discord.js";
import fs from "node:fs/promises";
import { join } from "node:path";
import { config, logger } from "..";

const commandsDir = await fs.readdir(join(__dirname, "commands"));
const commands = commandsDir.filter((cmd) => cmd.endsWith(".ts"));

try {
  const commandData = await Promise.all(
    commands.map(async (cmd) => {
      try {
        const CommandModule = await import(join(__dirname, "commands", cmd));
        const CommandClass = CommandModule.default;
        const commandInstance = new CommandClass();
        return commandInstance.data;
      } catch (error) {
        logger.error(`Error loading command ${cmd}: ${error}`);
      }
    })
  );

  const rest = new REST({ version: "10" }).setToken(config.bot_token);

  logger.info("Started refreshing application (/) commands.");

  try {
    const currentUser = (await rest.get(Routes.user())) as APIUser;

    const endpoint = Routes.applicationGuildCommands(
      currentUser.id,
      config.guild_id
    );
    await rest.put(endpoint, { body: commandData });

    logger.info("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error(`Error refreshing commands: ${error}`);
  }
} catch (error) {
  logger.error(`Error reading commands: ${error}`);
}
