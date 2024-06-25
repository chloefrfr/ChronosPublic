import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type CacheType,
} from "discord.js";
import BaseCommand from "../base/Base";
import { userService } from "../..";
import rotate from "../../shop/rotate/rotate";

export default class LookupCommand extends BaseCommand {
  data = {
    name: "rotate",
    description: "Rotates the item shop.",
    options: [],
    defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
    dmPermission: false,
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    const ro = await rotate();

    if (!ro) {
      const embed = new EmbedBuilder()
        .setTitle("Failed to Rotate")
        .setDescription("Failed to rotate storefront.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setTitle("Rotated Storefront")
      .setDescription("Successfully rotated storefront.")
      .setColor("Blurple")
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  }
}
