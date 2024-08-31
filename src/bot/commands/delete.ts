import {
  type CommandInteraction,
  type CacheType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonStyle,
  ActionRowBuilder,
  type AnyComponentBuilder,
  type Interaction,
  ComponentType,
  ButtonInteraction,
} from "discord.js";
import BaseCommand from "../base/Base";
import {
  accountService,
  friendsService,
  logger,
  profilesService,
  questsService,
  tokensService,
  userService,
} from "../..";

export default class DeleteCommand extends BaseCommand {
  data = {
    name: "delete",
    description: "Delete your account.",
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    try {
      const discordId = interaction.user.id as string;
      const user = await userService.findUserByDiscordId(discordId);
      const account = await accountService.findUserByDiscordId(discordId);

      if (!user || !account) {
        const embed = new EmbedBuilder()
          .setTitle("Failed to find user")
          .setDescription("User not found.")
          .setColor("#FF0000")
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      const profile = await profilesService.findByAccountId(user.accountId);
      if (!profile) {
        const embed = new EmbedBuilder()
          .setTitle("Failed to find profile")
          .setDescription("Profle not found.")
          .setColor("#FF0000")
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      const friends = await friendsService.findFriendByAccountId(user.accountId);
      if (!friends) {
        const embed = new EmbedBuilder()
          .setTitle("Failed to find friends")
          .setDescription("Friends not found.")
          .setColor("#FF0000")
          .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
      }

      const confirmButton = new ButtonBuilder()
        .setCustomId("confirmDelete")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId("cancelDelete")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

      await interaction.editReply({
        content: "Are you sure you want to delete your account?",
        components: [row as any],
      });

      // const filter = (i: ButtonInteraction<CacheType>) =>
      //   i.customId === "confirmDelete" || i.customId === "cancelDelete";
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15000,
      });

      collector?.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.customId === "confirmDelete") {
          const promises = [
            userService.delete(user.accountId),
            accountService.delete(user.accountId),
            profilesService.deleteByAccountId(user.accountId),
            friendsService.delete(user.accountId),
            questsService.deleteQuestsByAccountId(user.accountId),
          ];

          const [userDelete, accountDelete, profileDelete, friendDelete, questsDelete] =
            await Promise.all(promises);

          if (userDelete && accountDelete && profileDelete && friendDelete && questsDelete) {
            const embed = new EmbedBuilder()
              .setTitle("Account Deleted Successfully")
              .setDescription("Your account has been successfully deleted.")
              .setColor("Blurple")
              .setTimestamp();

            await buttonInteraction.update({
              embeds: [embed],
              components: [],
            });
          } else {
            const embed = new EmbedBuilder()
              .setTitle("Failed to Delete Account")
              .setDescription("There was an issue deleting your account. Please try again later.")
              .setColor("#FF0000")
              .setTimestamp();

            await buttonInteraction.update({
              embeds: [embed],
              components: [],
            });
          }
        } else if (buttonInteraction.customId === "cancelDelete") {
          const embed = new EmbedBuilder()
            .setTitle("Cancelled Account Deletion")
            .setDescription("You have cancelled the deletion of your account.")
            .setColor("Blurple")
            .setTimestamp();

          await buttonInteraction.update({
            embeds: [embed],
            components: [],
          });
        }
      });

      collector?.on("end", () => {
        interaction.editReply({ components: [] }).catch(console.error);
      });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("Operation Failed")
        .setDescription(error as string)
        .setColor("#FF0000")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }
  }
}
