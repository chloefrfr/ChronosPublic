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
        name: "event",
        type: ApplicationCommandOptionType.String,
        description: "The event you want to add.",
        required: true,
      },
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
    const eventOption = interaction.options.get("event", true);
    const eventValue = eventOption.value as string;

    const seasonOption = interaction.options.get("season", true);
    const seasonValue = seasonOption.value as number;

    const eventExists = Events.some((e) => e.value === eventValue && e.season === seasonValue);

    if (!eventExists) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Event Not Found")
        .setDescription(`The event "${eventValue}" does not exist.`)
        .setTimestamp();

      return await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
    }

    const activeSince = new Date().toISOString();
    const event = await TimelineHelper.addNewEvent(
      eventValue,
      activeSince,
      "9999-01-01T00:00:00.000Z",
      seasonValue,
    );

    if (!event.success) {
      {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("Inseration Error")
          .setDescription(`Failed to insert the event "${eventValue}" into the database.`)
          .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
      }
    }

    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setTitle("Successfully Added Event")
      .setDescription(`Successfully added the event "${event.event?.eventName}".`)
      .setTimestamp();

    return await interaction.reply({ embeds: [embed], ephemeral: false });
  }
}
