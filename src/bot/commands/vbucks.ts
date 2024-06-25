import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type CacheType,
} from "discord.js";
import BaseCommand from "../base/Base";
import { accountService, userService } from "../..";
import ProfileHelper from "../../utilities/profiles";
import { Profiles } from "../../tables/profiles";
import { HTTPRequests } from "../../utilities/requests";

export default class VbucksCommand extends BaseCommand {
  data = {
    name: "vbucks",
    description: "Change V-Bucks balance for a user",
    options: [
      {
        name: "user",
        type: ApplicationCommandOptionType.User,
        description: "The user you want to change the V-Bucks balance of",
        required: true,
      },
      {
        name: "vbucks",
        type: ApplicationCommandOptionType.String,
        description: "The amount of V-Bucks to add or subtract",
        required: true,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.BanMembers.toString(),
    dmPermission: false,
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    const user_data = interaction.options.get("user", true);
    const vbucksAmount = parseInt(interaction.options.get("vbucks", true).value as string);

    const account = await accountService.findUserByDiscordId(user_data.user?.id as string);
    const user = await userService.findUserByDiscordId(user_data.user?.id as string);

    if (!interaction.memberPermissions?.has("BanMembers")) {
      return await interaction.editReply({
        content: "You do not have permission to use this command.",
      });
    }

    if (!account || !user) {
      const embed = new EmbedBuilder()
        .setTitle("Failed to find user")
        .setDescription("User not found.")
        .setColor("#FF0000")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const profile = await ProfileHelper.getProfile(account.accountId, "common_core");
    if (!profile) {
      const embed = new EmbedBuilder()
        .setTitle("Failed to find Profile")
        .setDescription("Profile 'common_core' was not found.")
        .setColor("#FF0000")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    profile.items["Currency:MtxPurchased"].quantity += vbucksAmount;

    await Profiles.createQueryBuilder()
      .update(Profiles)
      .set({ profile })
      .where("type = :type", { type: "common_core" })
      .andWhere("accountId = :accountId", { accountId: account.accountId })
      .execute();

    await HTTPRequests.RefreshAccount(account.accountId, user.username);

    const embed = new EmbedBuilder()
      .setTitle("Vbucks Changed")
      .setDescription(
        `Successfully updated the V-Bucks balance for user ${user.username} to ${vbucksAmount}.`,
      )
      .setColor("Blurple")
      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  }
}
