import type { User } from "../tables/user";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuid } from "uuid";
import type { Stats } from "../tables/account";
import type { ProfileId } from "./responses";
import { logger, profilesService } from "..";
import type { Profiles } from "../tables/profiles";
import type { IProfile } from "../../types/profilesdefs";
import { createGameModeStats } from "./creations/static_creations";

export default class ProfileHelper {
  static async createProfile(user: Partial<User>, profile: ProfileId) {
    const profilePath = path.join(__dirname, "..", "memory", "profiles", `${profile}.json`);
    const profileTemplate = JSON.parse(await fs.readFile(profilePath, "utf-8")) as Profiles;

    return {
      ...profileTemplate,
      accountId: user.accountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _id: uuid().replace(/-/g, ""),
      version: "Chronos",
    } as any;
  }

  static getProfileData(
    profile: Profiles,
    profileName: keyof Omit<Profiles, "accountId">,
  ): IProfile | null {
    return (profile[profileName] as IProfile) || null;
  }

  static async getProfile(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<IProfile | undefined> {
    try {
      const profile = await profilesService.findByName(accountId, profileName);

      if (!profile) {
        logger.error(`Profile of type ${profileName} not found.`);
        return undefined;
      }

      return ProfileHelper.getProfileData(profile, profileName) || undefined;
    } catch (error) {
      logger.error(`Failed to get profile of type ${profileName}: ${error}`);
      return undefined;
    }
  }

  static createStatsTemplate(): Stats {
    const gameModeStats = createGameModeStats();
    return {
      solos: gameModeStats,
      duos: gameModeStats,
      squads: gameModeStats,
      ltm: gameModeStats,
    };
  }
}
