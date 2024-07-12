import path from "node:path";
import { config, logger, profilesService } from "../..";
import type { BattlePassStorefront } from "../../shop/interfaces/Declarations";
import type { ProfileId } from "../responses";
import ProfileHelper from "../profiles";
import { Profiles } from "../../tables/profiles";

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
      path.join(__dirname, "..", "..", "memory", "season", "SeasonFreeRewards.json"),
    ).json();
  }

  export async function GetSeasonPaidRewards(): Promise<Rewards[]> {
    return await Bun.file(
      path.join(__dirname, "..", "..", "memory", "season", "SeasonPaidRewards.json"),
    ).json();
  }

  export async function GetSeasonXP(): Promise<SeasonXP[]> {
    return await Bun.file(
      path.join(__dirname, "..", "..", "memory", "season", "SeasonXP.json"),
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

  export async function ClaimCosmeticVariantTokenReward(VTID: string, accountId: string) {
    const tokens = await GetCosmeticVariantTokenReward();

    logger.debug(`Attemping to find rewards for VTID: ${VTID}`);

    const reward = tokens[VTID];
    if (!reward) return;

    logger.debug(`Successfully found rewards for VTID: ${VTID}`);

    const athena = await ProfileHelper.getProfile(accountId, "athena");
    if (!athena) return;

    const item = athena.items[reward.templateId];
    if (item) {
      if (!item.attributes.variants!.find((variant: any) => variant.channel === reward.channel)) {
        item.attributes.variants!.push({
          channel: reward.channel,
          owned: [],
        });
      }

      const variant = item.attributes.variants!.find(
        (variant: any) => variant.channel === reward.channel,
      );
      if (!variant!.owned.includes(reward.value)) {
        variant!.owned.push(reward.value);
      }
    }
    await profilesService.update(accountId, "athena", athena);
    return reward;
  }
}
