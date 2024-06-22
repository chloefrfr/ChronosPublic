import { accountService, logger } from "..";

export type ProfileId = "athena" | "common_core" | "creative" | "common_public";

export default class MCPResponses {
  static generate(profile: any, changes: object[], profileId: ProfileId) {
    return {
      profileRevision: parseInt(profile.rvn),
      profileId: profileId,
      profileChangesBaseRevision: parseInt(profile.rvn) - 1,
      profileChanges: changes,
      profileCommandRevision: parseInt(profile.rvn),
      serverTime: new Date().toISOString(),
      responseVersion: 1,
    };
  }

  static generatePurchaseResponse(
    profile: any,
    athena: any,
    applyProfileChanges: object[],
    multiUpdates: object[],
    notifications: object[],
    profileId: ProfileId,
  ) {
    return {
      profiileRevision: profile.rvn,
      profileId,
      profileChangesBaseRevision: profile.rvn - 1,
      profileChanges: applyProfileChanges,
      notifications: [
        {
          type: "CatalogPurchase",
          primary: true,
          lootResult: {
            items: notifications,
          },
        },
      ],
      profileCommandRevision: profile.commandRevision,
      serverTime: new Date().toISOString(),
      multiUpdate: [
        {
          profileRevision: athena.rvn,
          profileId: "athena",
          profileChangesBaseRevision: athena.rvn - 1,
          profileChanges: multiUpdates,
          profileCommandRevision: athena.commandRevision,
        },
      ],
      responseVersion: 1,
    };
  }
}
