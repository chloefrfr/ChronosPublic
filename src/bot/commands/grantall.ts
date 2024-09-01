import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type CacheType,
  type ColorResolvable,
} from "discord.js";
import BaseCommand from "../base/Base";
import { accountService, profilesService, userService } from "../..";
import path from "node:path";
import { Account } from "../../tables/account";
import ProfileHelper from "../../utilities/profiles";
import { User } from "../../tables/user";
import { SendMessageToId } from "../../sockets/xmpp/utilities/SendMessageToId";
import RefreshAccount from "../../utilities/refresh";

export interface Gifts {
  templateId: string;
  templateIdHashed: string;
  fromAccountId: string;
  userMessage: string;
  time: string;
  lootList: LootList[];
}

export interface LootList {
  itemType: string;
  itemGuid: string;
  itemProfile: string;
  quantity: number;
}

export default class GrantAllCommand extends BaseCommand {
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
    if (!interaction.memberPermissions?.has("BanMembers")) {
      return await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const user_data = await interaction.options.get("user", true);
    const user = await userService.findUserByDiscordId(user_data.user?.id as string);

    if (!user) {
      return await this.sendEmbed(
        interaction,
        "User not found.",
        "Failed to find user, please try again.",
        "Red",
      );
    }

    const account = await accountService.findUserByDiscordId(user.discordId);
    if (!account) {
      return await this.sendEmbed(
        interaction,
        "Account not found.",
        "Failed to find account, please try again.",
        "Red",
      );
    }

    if (user.banned) {
      return await this.sendEmbed(interaction, "User is Banned", "This user is banned.", "Red");
    }

    if (user.has_all_items) {
      return await this.sendEmbed(
        interaction,
        "Already has full locker.",
        "This user already has full locker.",
        "Red",
      );
    }

    const athena = await ProfileHelper.getProfile(user.accountId, "athena");
    if (!athena) {
      return await this.sendEmbed(
        interaction,
        "Profile not found",
        "The profile 'athena' was not found.",
        "Red",
      );
    }

    try {
      const allItems = require(path.join(__dirname, "..", "..", "memory", "all.json"));
      athena.items = { ...athena.items, ...allItems };

      await profilesService.update(user.accountId, "athena", athena);

      await User.createQueryBuilder()
        .update(User)
        .set({ has_all_items: true })
        .where("accountId = :accountId", { accountId: user.accountId })
        .execute();

      await RefreshAccount(user.accountId, user.username);

      const embed = new EmbedBuilder()
        .setTitle("Success")
        .setDescription(`Successfully granted all items to ${user_data.user?.username}'s account.`)
        .setColor("Blurple")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      return await interaction.reply({
        content: "Failed to grant all items. Please try again later.",
        ephemeral: true,
      });
    }
  }

  private async sendEmbed(
    interaction: CommandInteraction<CacheType>,
    title: string,
    description: string,
    color: ColorResolvable,
  ) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
