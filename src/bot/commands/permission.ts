import {
  EmbedBuilder,
  type CacheType,
  CommandInteraction,
  ApplicationCommandOptionType,
} from "discord.js";
import { XmppService } from "../../sockets/xmpp/saved/XmppServices";
import BaseCommand from "../base/Base";
import { accountService, logger, tokensService, userService } from "../..";
import type { Abilities, AbilitiesCombination } from "../../../types/permissionsdefs";
import PermissionInfo from "../../utilities/permissions/permissioninfo";
import { getRandomAction } from "../../utilities/getRandomAction";

export default class PermissionCommand extends BaseCommand {
  data = {
    name: "permission",
    description: "Manage permissions for a user's account",
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "add",
        description: "Add a permission to a user's account",
        options: [
          {
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "The user to add permission to",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "permission",
            description: "The permission to add",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "abilities",
            description: "The abilities to assign.",
            choices: [
              { name: "READ", value: "READ" },
              { name: "DELETE", value: "DELETE" },
              { name: "LIST", value: "LIST" },
              { name: "CREATE", value: "CREATE" },
              { name: "*", value: "*" },
            ],
            required: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "delete",
        description: "Delete a permission from a user's account",
        options: [
          {
            type: ApplicationCommandOptionType.User,
            name: "user",
            description: "The user to remove permission from",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "permission",
            description: "The permission to remove",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "abilities",
            description: "The abilities to assign.",
            choices: [
              { name: "READ", value: "READ" },
              { name: "DELETE", value: "DELETE" },
              { name: "LIST", value: "LIST" },
              { name: "CREATE", value: "CREATE" },
              { name: "*", value: "*" },
            ],
            required: true,
          },
        ],
      },
    ],
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: false });

    const subcommand = interaction.options.data[0]?.name;

    if (!subcommand) {
      const embed = new EmbedBuilder()
        .setTitle("Subcommand Not Found.")
        .setDescription("Failed to find subcommand.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const action = getRandomAction();

    try {
      if (subcommand === "add") {
        const discord = interaction.options.get("user", true);
        const permission = interaction.options.get("permission", true);
        const abilitiesSub = interaction.options.get("abilities", true);

        const abilities = abilitiesSub.value as Abilities | AbilitiesCombination;

        const account = await accountService.findUserByDiscordId(discord.user!.id);
        const user = await userService.findUserByDiscordId(discord.user!.id);
        if (!account || !user) {
          const embed = new EmbedBuilder()
            .setTitle("User Not Found")
            .setDescription("Failed to find user, please try again.")
            .setColor("Red")
            .setTimestamp();
          return await interaction.editReply({ embeds: [embed] });
        }

        const permissionInfo = new PermissionInfo(
          account.accountId,
          user.username,
          "3446cd72694c4a4485d81b77adbb2141",
          "authorization_code",
        );

        const success = await permissionInfo.addPermission({
          resource: permission.value as string,
          abilities: abilities,
          action: action,
        });

        const embed = new EmbedBuilder()
          .setTitle(success ? "Permission Added" : "Failed to Add Permission")
          .setDescription(
            `Permission "${
              permission.value
            }" with abilities "${abilities}" and action ${action} was ${
              success ? "successfully added" : "not added"
            }.`,
          )
          .setColor(success ? "Blurple" : "Red")
          .setTimestamp();
        return await interaction.editReply({ embeds: [embed] });
      } else if (subcommand === "delete") {
        const discord = interaction.options.get("user", true);
        const permission = interaction.options.get("permission", true);
        const abilities = interaction.options.get("abilities", true) as any satisfies Abilities;

        const account = await accountService.findUserByDiscordId(discord.user!.id);
        const user = await userService.findUserByDiscordId(discord.user!.id);
        if (!account || !user) {
          const embed = new EmbedBuilder()
            .setTitle("User Not Found")
            .setDescription("Failed to find user, please try again.")
            .setColor("Red")
            .setTimestamp();
          return await interaction.editReply({ embeds: [embed] });
        }

        const permissionInfo = new PermissionInfo(
          account.accountId,
          user.username,
          "3446cd72694c4a4485d81b77adbb2141",
          "authorization_code",
        );

        const success = await permissionInfo.removePermission(permission.value as string);

        const embed = new EmbedBuilder()
          .setTitle(success ? "Permission Removed" : "Failed to Remove Permission")
          .setDescription(
            `Permission "${permission.value}" was ${
              success ? "successfully removed" : "not removed"
            }.`,
          )
          .setColor(success ? "Blurple" : "Red")
          .setTimestamp();
        return await interaction.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("Unknown Command")
          .setDescription("The specified command is not recognized.")
          .setColor("Red")
          .setTimestamp();
        return await interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error(`Failed to handle permission: ${error}`);
      const embed = new EmbedBuilder()
        .setTitle("Internal Server Error")
        .setDescription("An internal server error has occurred.")
        .setColor("Red")
        .setTimestamp();
      return await interaction.editReply({ embeds: [embed] });
    }
  }
}
