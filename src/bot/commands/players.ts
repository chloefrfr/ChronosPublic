import { EmbedBuilder, type CacheType, type CommandInteraction } from "discord.js";
import { XmppService } from "../../sockets/xmpp/saved/XmppServices";
import BaseCommand from "../base/Base";
import { logger } from "../..";

export default class PlayersCommand extends BaseCommand {
  data = {
    name: "players",
    description: "Show's the current playercount.",
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: false });

    const playerCount = XmppService.clients.filter((count) => count).length;
    let embed;

    if (playerCount !== 0) {
      embed = new EmbedBuilder()
        .setTitle("Amount of Players Online.")
        .setDescription(
          `There ${playerCount === 1 ? "is" : "are"} currently ${playerCount} ${
            playerCount === 1 ? "player" : "players"
          } online.`,
        )
        .setColor("Blurple")
        .setTimestamp();
    } else {
      embed = new EmbedBuilder()
        .setTitle("Amount of Players Online.")
        .setDescription("There is currently 0 players online.")
        .setColor("Blurple")
        .setTimestamp();
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
