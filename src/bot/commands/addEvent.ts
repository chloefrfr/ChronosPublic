import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type CacheType,
} from "discord.js";
import BaseCommand from "../base/Base";
import { Events } from "../../constants/events";
import TimelineHelper from "../../utilities/timelinehelper";

export default class AddEventCommand extends BaseCommand {
  data = {
    name: "addevent",
    description: "Add a timeline event of your choice.",
    options: [
      {
        name: "season",
        type: ApplicationCommandOptionType.Number,
        description: "The season for the event.",
        required: true,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Administrator.toString(),
    dmPermission: false,
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    const seasonOption = interaction.options.get("season", true);
    const seasonValue = seasonOption.value as number;

    const events = Events.filter((e) => e.season === seasonValue);

    const results = {
      added: [] as any[],
      failed: [] as any[],
    };

    for (const event of events) {
      const eventExists = Events.some((e) => e.value === event.value && e.season === seasonValue);

      if (!eventExists) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("Event Not Found")
          .setDescription(`The event "${event.value}" does not exist.`)
          .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
        continue;
      }

      const activeSince = new Date().toISOString();
      const dbResponse = await TimelineHelper.addNewEvent(
        event.value,
        activeSince,
        "9999-01-01T00:00:00.000Z",
        seasonValue,
      );

      if (dbResponse.success) {
        results.added.push(event.value);
      } else {
        results.failed.push(event.value);
      }
    }

    let responseDescription = "";

    if (results.added.length > 0) {
      responseDescription += `Successfully added the following events: ${results.added.join(
        ", ",
      )}.\n`;
    }

    if (results.failed.length > 0) {
      responseDescription += `Failed to add the following events: ${results.failed.join(", ")}.`;
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle(results.failed.length > 0 ? "Partial Success" : "Successfully Added Events")
      .setDescription(responseDescription)
      .setTimestamp();

    return await interaction.reply({ embeds: [embed], ephemeral: false });
  }
}
