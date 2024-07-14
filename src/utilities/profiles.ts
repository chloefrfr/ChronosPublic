import type { User } from "../tables/user";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuid } from "uuid";
import type { BattlePass, Stats } from "../tables/account";
import type { ProfileId } from "./responses";
import { accountService, logger, profilesService } from "..";
import type { Profiles } from "../tables/profiles";
import type { Athena, CommonCore, CommonPublic } from "../../types/profilesdefs";
import { Caching } from "./cache";

type profiles = "athena" | "common_core";
const profileCache: { [accountId: string]: { [type in ProfileId]?: Promise<any> } } = {};

export default class ProfileHelper {
  static async createProfile(user: Partial<User>, profile: profiles) {
    const profile_template = JSON.parse(
      await fs.readFile(path.join(__dirname, "..", "memory", `${profile}.json`), "utf-8"),
    );

    profile_template.accountId = user.accountId;
    profile_template.createdAt = new Date().toISOString();
    profile_template.updatedAt = new Date().toISOString();
    profile_template._id = uuid().replace(/-/gi, "");
    profile_template.version = "Chronos";

    return profile_template;
  }

  static async getProfile(accountId: string, profileName: keyof Omit<Profiles, "accountId">) {
    try {
      let profileData;

      const profile = await profilesService.findByName(accountId, profileName);

      if (!profile) {
        logger.error(`Failed to get profile of type ${profileName}: Profile not found`);
        return null;
      }

      switch (profileName) {
        case "athena":
          profileData = profile.athena as Athena;
          break;
        case "common_core":
          profileData = profile.common_core as CommonCore;
          break;
        case "common_public":
          profileData = profile.common_public as CommonPublic;
          break;
        default:
          return null;
      }

      if (!profileData) {
        logger.error(`Profile ${profileName} not found.`);
        return null;
      }

      return profileData;
    } catch (error) {
      return void logger.error(`failed to get profile of type ${profileName}: ${error}`);
      return null;
    }
  }

  static async GenerateProfileChange(changeType: string, profileData: any) {
    return new Promise((resolve, reject) => {
      try {
        const profileChange = {
          changeType,
          _id: uuid().replace(/-/gi, ""),
          profile: { ...profileData },
        };

        resolve([profileChange]);
      } catch (error) {
        reject(error);
      }
    });
  }

  static createBattlePassTemplate(): BattlePass {
    return {
      book_purchased: false,
      book_level: 1,
      book_xp: 0,
      season_friend_match_boost: 0,
      season_match_boost: 0,
      level: 1,
      battlestars_currency: 0,
      battlestars: 0,
      intro_game_played: false,
      purchased_battle_pass_tier_offers: [],
      purchased_bp_offers: [],
      xp: 0,
    };
  }

  static createStatsTemplate(): Stats {
    return {
      solos: {
        kills: 0,
        matchplayed: 0,
        wins: 0,
      },
      duos: {
        kills: 0,
        matchplayed: 0,
        wins: 0,
      },
      squads: {
        kills: 0,
        matchplayed: 0,
        wins: 0,
      },
      ltm: {
        kills: 0,
        matchplayed: 0,
        wins: 0,
      },
    };
  }
}
