import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  type CacheType,
} from "discord.js";
import { accountService, userService } from "../..";
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

    const BattlePassObject = account.battlepass;
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
          value: `Purchased: ${BattlePassObject.book_purchased}\nTier: ${BattlePassObject.book_level}\nLevel: ${BattlePassObject.level}\nBattlepass XP: ${BattlePassObject.book_xp}\nXP: ${BattlePassObject.xp}`,
          inline: true,
        },
        {
          name: "Seasonal Stats",
          value: `**Solos** - Wins: ${Stats.solos.wins}, Kills: ${Stats.solos.kills}, Matches Played: ${Stats.solos.matchplayed}\n**Duos** - Wins: ${Stats.duos.wins}, Kills: ${Stats.duos.kills}, Matches Played: ${Stats.duos.matchplayed}\n**Squads** - Wins: ${Stats.squads.wins}, Kills: ${Stats.squads.kills}, Matches Played: ${Stats.squads.matchplayed}`,
          inline: true,
        },
      )

      .setTimestamp();

    return await interaction.editReply({ embeds: [embed] });
  }
}
