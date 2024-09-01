import path from "node:path";
import { config, logger, profilesService } from "../..";
import type { BattlePassStorefront } from "../../shop/interfaces/Declarations";
import type { ProfileId } from "../responses";
import ProfileHelper from "../profiles";
import { Profiles } from "../../tables/profiles";
import type { Variants } from "../../../types/profilesdefs";

export interface Rewards {
  TemplateId: string;
  Quantity: number;
  Tier: number;
}

export interface SeasonXP {
  Level: number;
  XpToNextLevel: number;
  XpTotal: number;
}

export namespace BattlepassManager {
  export async function GetStorefrontBattlepass(season: number): Promise<BattlePassStorefront> {
    return await Bun.file(
      path.join(__dirname, "..", "..", "memory", "storefront", `BRSeason${season}.json`),
    ).json();
  }

  export async function GetSeasonFreeRewards(): Promise<Rewards[]> {
    return await Bun.file(
      path.join(
        __dirname,
        "..",
        "..",
        "memory",
        "season",
        "battlepass",
        `Season${config.currentSeason}`,
        "SeasonFreeRewards.json",
      ),
    ).json();
  }

  export async function GetSeasonPaidRewards(): Promise<Rewards[]> {
    return await Bun.file(
      path.join(
        __dirname,
        "..",
        "..",
        "memory",
        "season",
        "battlepass",
        `Season${config.currentSeason}`,
        "SeasonPaidRewards.json",
      ),
    ).json();
  }

  export async function GetSeasonXP(): Promise<SeasonXP[]> {
    return await Bun.file(
      path.join(
        __dirname,
        "..",
        "..",
        "memory",
        "season",
        "battlepass",
        `Season${config.currentSeason}`,
        "SeasonXP.json",
      ),
    ).json();
  }

  export async function GetCosmeticVariantTokenReward() {
    const tokens = await Bun.file(
      path.join(__dirname, "..", "..", "memory", "variantTokens.json"),
    ).json();

    const rewards: {
      [token: string]: {
        templateId: string;
        channel: string;
        value: string;
      };
    } = {};

    for (const id in tokens) {
      const data = tokens[id];

      rewards[id] = {
        templateId: data.templateId,
        channel: data.channel,
        value: data.value,
      };
    }

    return rewards;
  }
}
