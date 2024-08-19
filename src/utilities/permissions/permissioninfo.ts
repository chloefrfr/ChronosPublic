import { accountService, logger } from "../..";
import type {
  Abilities,
  AbilitiesCombination,
  GrantType,
  Permission,
} from "../../../types/permissionsdefs";
import { Account } from "../../tables/account";
import { parseAbilities } from "./permissionhelpers";

const VALID_ABILITIES: Abilities[] = ["READ", "DELETE", "LIST", "CREATE", "*"];
const VALID_GRANTS: GrantType[] = ["client_credentials", "authorization_code", "refresh_token"];

export default class PermissionInfo {
  private readonly grant: GrantType;

  constructor(
    public accountId: string | null,
    public displayName: string | null,
    public clientId: string,
    grant: GrantType,
  ) {
    this.grant = VALID_GRANTS.includes(grant) ? grant : "client_credentials";

    this.init();
  }

  private async init(): Promise<void> {
    if (this.accountId) {
      const account = await accountService.findUserByAccountId(this.accountId);

      if (account) {
        const defaultPermissions: Permission[] = [
          { resource: "fortnite:cloudstorage:system", abilities: "READ", action: 1 },
          { resource: "fortnite:cloudstorage:system:*", abilities: "READ", action: 2 },
          { resource: `friends:${this.accountId}`, abilities: "READ,UPDATE,DELETE", action: 15 },
          { resource: `fortnite:profile:${this.accountId}:commands`, abilities: "*", action: 10 },
          { resource: `fortnite:profile:${this.accountId}:receipts`, abilities: "*", action: 10 },
          { resource: "fortnite:calender", abilities: "READ", action: 2 },
          {
            resource: "fortnite:cloudstorage:system:DefaultEngine.ini",
            abilities: "READ",
            action: 1,
          },
          {
            resource: "fortnite:cloudstorage:system:DefaultGame.ini",
            abilities: "READ",
            action: 1,
          },
          {
            resource: "fortnite:cloudstorage:system:DefaultRuntimeOptions.ini",
            abilities: "READ",
            action: 1,
          },
          { resource: "fortnite:stats", abilities: "READ", action: 2 },
        ];

        for (const permission of defaultPermissions) {
          await this.addPermission(permission);
        }
      }
    }
  }

  public async removePermission(resource: string): Promise<boolean> {
    try {
      const result = await Account.createQueryBuilder()
        .update(Account)
        .set({ permissions: () => `jsonb_set(permissions, '{${resource}}', 'null')` })
        .where("accountId = :accountId", { accountId: this.accountId })
        .execute();

      if (result.affected === 0) {
        logger.error(`Permission ${resource} does not exist.`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Error removing permission: ${error}`);
      return false;
    }
  }

  public async addPermission(permission: Permission): Promise<boolean> {
    try {
      if (!this.isPermissionValid(permission)) {
        logger.error(
          `Attempted to add invalid permission: ${permission.resource} [${JSON.stringify(
            permission.abilities,
          )}]`,
        );
        return false;
      }

      const account = await accountService.findUserByAccountId(this.accountId as string);
      if (!account) {
        logger.error(`Account ${this.accountId} does not exist.`);
        return false;
      }

      const permissions = (account.permissions as Permission[]) || [];
      const existingPermissionIndex = permissions.findIndex(
        (p) => p.resource === permission.resource,
      );

      if (existingPermissionIndex !== -1) {
        const existingPermission = permissions[existingPermissionIndex];

        if (
          existingPermission.abilities !== permission.abilities ||
          existingPermission.action !== permission.action
        ) {
          permissions[existingPermissionIndex] = permission;
        }
      } else {
        permissions.push(permission);
      }

      await Account.createQueryBuilder()
        .update(Account)
        .set({ permissions: permissions })
        .where("accountId = :accountId", { accountId: this.accountId })
        .execute();

      return true;
    } catch (error) {
      logger.error(`Error adding permission: ${error}`);
      return false;
    }
  }

  public async hasPermission(
    resource: string,
    requiredAbilities: Abilities | AbilitiesCombination[],
  ): Promise<boolean> {
    try {
      const account = await accountService.findUserByAccountId(this.accountId as string);

      if (!account) {
        logger.error(`Account ${this.accountId} does not exist.`);
        return false;
      }

      const permissions = (account.permissions as Permission[]) || [];
      const perm = permissions.find((p) => p.resource === resource);
      if (!perm) {
        logger.error(`Permission ${resource} does not exist.`);
        return false;
      }

      const abilitiesArray = Array.isArray(requiredAbilities)
        ? requiredAbilities.map((ra) => ra.trim())
        : [requiredAbilities.trim()];

      const permAbilities = parseAbilities(perm.abilities);

      const hasRequiredAbilities = abilitiesArray.some(
        (ra) =>
          permAbilities.includes(ra) ||
          ra === "*" ||
          permAbilities.includes("*") ||
          ra === "READ,UPDATE,DELETE",
      );

      if (!hasRequiredAbilities) {
        logger.error(
          `Required abilities ${abilitiesArray.join(", ")} not found for resource ${resource}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Error checking permission: ${error}`);
      return false;
    }
  }

  private isPermissionValid(permission: Permission): boolean {
    return (
      typeof permission.resource === "string" &&
      typeof permission.abilities === "string" &&
      VALID_ABILITIES.some((a) => permission.abilities.includes(a)) &&
      typeof permission.action === "number"
    );
  }

  public async getPermissions(): Promise<Permission[]> {
    try {
      const account = await accountService.findUserByAccountId(this.accountId as string);

      if (!account) {
        logger.error(`Account ${this.accountId} does not exist.`);
        return [];
      }

      return (account.permissions as Permission[]) || [];
    } catch (error) {
      logger.error(`Error getting permissions: ${error}`);
      return [];
    }
  }

  // im lazy so im just adding this
  public errorReturn(resource: string, ability: Abilities | AbilitiesCombination): string {
    return `Sorry your login does not possess the permissions '${resource} ${ability}' needed to perform the requested operation`;
  }
}
