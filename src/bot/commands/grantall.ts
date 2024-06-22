import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type CacheType,
} from "discord.js";
import BaseCommand from "../base/Base";
import { accountService, userService } from "../..";
import path from "node:path";
import { Account } from "../../tables/account";
import ProfileHelper from "../../utilities/profiles";
import { User } from "../../tables/user";
import { Profiles } from "../../tables/profiles";

export default class GrantallCommand extends BaseCommand {
  data = {
    name: "grantall",
    description: "Grants a user all cosmetics.",
    options: [
      {
        name: "user",
        type: ApplicationCommandOptionType.User,
        description: "The user you want to grant all items to.",
        required: true,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.BanMembers.toString(),
    dmPermission: false,
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    const user_data = await interaction.options.get("user", true);

    const user = await userService.findUserByDiscordId(user_data.user?.id as string);

    if (!interaction.memberPermissions?.has("BanMembers"))
      return await interaction.editReply({
        content: "You do not have permission to use this command.",
      });

    if (!user) {
      const embed = new EmbedBuilder()
        .setTitle("User not found.")
        .setDescription("Failed to find user, please try again.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const account = await accountService.findUserByDiscordId(user.discordId);

    if (!account) {
      const embed = new EmbedBuilder()
        .setTitle("Account not found.")
        .setDescription("Failed to find account, please try again.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    if (user.banned) {
      const embed = new EmbedBuilder()
        .setTitle("User is Banned")
        .setDescription("This user is banned.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    if (user.has_all_items) {
      const embed = new EmbedBuilder()
        .setTitle("Already has full locker.")
        .setDescription("This user already has full locker.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const athena = await ProfileHelper.getProfile("athena");

    if (!athena) {
      const embed = new EmbedBuilder()
        .setTitle("Profile not found")
        .setDescription("The profile 'athena' was not found.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const All = await Bun.file(path.join(__dirname, "..", "..", "memory", "all.json")).json();

    athena.items = All;

    const embed = new EmbedBuilder()
      .setTitle("Success")
      .setDescription(`Successfully granted all items to ${user_data.user?.username}'s account.`)
      .setColor("Blurple")
      .setTimestamp();

    await Profiles.createQueryBuilder()
      .update(Profiles)
      .set({ profile: athena })
      .where("type = :type", { type: "athena" })
      .execute();

    await User.createQueryBuilder()
      .update(User)
      .set({ has_all_items: true })
      .where("accountId = :accountId", { accountId: user.accountId })
      .execute();

    return await interaction.editReply({ embeds: [embed] });
  }
}
