import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  type CacheType,
} from "discord.js";
import { accountService, profilesService, userService } from "../..";
import BaseCommand from "../base/Base";

export default class AccountCommand extends BaseCommand {
  data = {
    name: "account",
    description: "View your account information.",
    options: [],
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    const user = await userService.findUserByDiscordId(interaction.user.id);

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

    const profile = await profilesService.findByName(account.accountId, "athena");

    if (!profile) {
      const embed = new EmbedBuilder()
        .setTitle("Profile not found.")
        .setDescription("Failed to find profile, please try again.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const Stats = account.stats;

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .addFields(
        {
          name: "User Information",
          value: `Banned: ${user.banned}\nDiscord: <@${user.discordId}>\nUsername: ${user.username}\nFull Locker: ${user.has_all_items}\nAccountId: ${user.accountId}`,
          inline: true,
        },

        {
          name: "Battlepass Details",
          value: `Purchased: ${profile.athena.stats.attributes.book_purchased}\nTier: ${profile.athena.stats.attributes.book_level}\nLevel: ${profile.athena.stats.attributes.level}\nBattlepass XP: ${profile.athena.stats.attributes.book_xp}\nXP: ${profile.athena.stats.attributes.xp}`,
          inline: true,
        },
        {
          name: "Seasonal Stats",
          value: `**Solos** - Wins: ${Stats.solos.wins}, Kills: ${Stats.solos.kills}, Matches Played: ${Stats.solos.matchesplayed}\n**Duos** - Wins: ${Stats.duos.wins}, Kills: ${Stats.duos.kills}, Matches Played: ${Stats.duos.matchesplayed}\n**Squads** - Wins: ${Stats.squads.wins}, Kills: ${Stats.squads.kills}, Matches Played: ${Stats.squads.matchesplayed}`,
          inline: true,
        },
      )

      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  }
}
