import { GuildMember, Role } from "discord.js";
import { logger, userService } from "../..";
import { User } from "../../tables/user";

export default class GuildMemberUpdateEvent {
  name = "guildMemberUpdate";
  once = false;

  async execute(oldMember: GuildMember, newMember: GuildMember) {
    try {
      const hasSpecificRole = this.hasRole(newMember, "Members");
      if (!hasSpecificRole) return;

      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = this.getDifference(newRoles, oldRoles);
      const removedRoles = this.getDifference(oldRoles, newRoles);

      if (addedRoles.length === 0 && removedRoles.length === 0) return;

      const user = await userService.findUserByDiscordId(newMember.id);
      if (!user) return;

      const roleNames = newRoles.map((role) => role.name);
      await User.createQueryBuilder()
        .update(User)
        .set({ roles: roleNames })
        .where("accountId = :accountId", { accountId: user.accountId })
        .execute();
    } catch (error) {
      logger.error(`Error in guildMemberUpdate: ${error}`);
    }
  }

  private async hasRole(member: GuildMember, roleId: string): Promise<boolean> {
    try {
      return member.roles.cache.has(roleId);
    } catch (error) {
      logger.error(`Error checking role: ${error}`);
      return false;
    }
  }

  private getDifference(a: Map<string, Role>, b: Map<string, Role>): Role[] {
    return [...a.values()].filter((role) => !b.has(role.id));
  }
}
