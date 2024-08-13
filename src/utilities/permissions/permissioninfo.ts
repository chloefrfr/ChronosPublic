import { logger } from "../..";
import type {
  Abilities,
  AbilitiesCombination,
  GrantType,
  Permission,
} from "../../../types/permissionsdefs";
import { parseAbilities } from "./permissionhelpers";

const VALID_ABILITIES: Abilities[] = ["READ", "DELETE", "LIST", "CREATE", "*"];
const VALID_GRANTS: GrantType[] = ["client_credentials", "authorization_code", "refresh_token"];

export default class PermissionInfo {
  private permissions: Map<string, Permission> = new Map();
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

  private init(): void {
    this.addPermission({
      resource: "fortnite:cloudstorage:system",
      abilities: "READ",
      action: 1,
    });
    this.addPermission({
      resource: "fortnite:cloudstorage:system:*",
      abilities: "READ",
      action: 2,
    });

    if (this.grant !== "client_credentials") {
      this.addPermission({
        resource: `friends:${this.accountId}`,
        abilities: "READ,UPDATE,DELETE",
        action: 15,
      });
      this.addPermission({
        resource: `fortnite:profile:${this.accountId}:commands`,
        abilities: "*",
        action: 10,
      });
    }
  }

  public removePermission(resource: string): boolean {
    if (!this.permissions.has(resource)) {
      logger.error(`Permission ${resource} does not exist.`);
      return false;
    }

    this.permissions.delete(resource);
    return true;
  }

  public addPermission(permission: Permission): boolean {
    if (!this.isPermissionValid(permission)) {
      logger.error(
        `Attempted to add invalid permission: ${permission.resource} [${JSON.stringify(
          permission.abilities,
        )}]`,
      );
      return false;
    }

    this.permissions.set(permission.resource, permission);
    return true;
  }

  public hasPermission(
    resource: string,
    requiredAbilities: Abilities | AbilitiesCombination[],
  ): boolean {
    const perm = this.permissions.get(resource);
    if (!perm) {
      logger.error(`Permission ${resource} does not exist.`);
      return false;
    }

    const abilitiesArray = Array.isArray(requiredAbilities)
      ? requiredAbilities
      : [requiredAbilities];
    const permAbilities = parseAbilities(perm.abilities);

    const hasRequiredAbilities = abilitiesArray.some(
      (ra) => permAbilities.includes(ra as any) || ra === "*",
    );

    console.debug(hasRequiredAbilities);

    if (!hasRequiredAbilities) {
      logger.error(`Required abilities ${abilitiesArray} not found for resource ${resource}`);
      return false;
    }

    return hasRequiredAbilities;
  }

  private isPermissionValid(permission: Permission): boolean {
    return (
      typeof permission.resource === "string" &&
      typeof permission.abilities === "string" &&
      VALID_ABILITIES.some((a) => permission.abilities.includes(a)) &&
      typeof permission.action === "number"
    );
  }

  public getPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  // im lazy so im just adding this
  public errorReturn(resource: string, ability: Abilities | AbilitiesCombination): string {
    return `Sorry your login does not posses the permissions '${resource} ${ability}' needed to perform the requested operation`;
  }
}
