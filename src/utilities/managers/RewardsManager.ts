import { config, logger } from "../..";
import { BattlepassManager } from "./BattlepassManager";
import { LevelsManager, type PastSeasons } from "./LevelsManager";

type Types = "athena" | "common_core" | "athenaseasonxpboost" | "athenaseasonfriendxpboost";

interface ItemOut {
  templateId: string;
  type: Types;
  attributes: Attributes;
  quantity: number;
}

interface Attributes {
  max_level_bonus: number;
  level: number;
  item_seen: boolean;
  xp: number;
  variants: object[];
  favorite: boolean;
}

export namespace RewardsManager {
  export async function addGrant(pastSeasons: PastSeasons) {
    let originalBookLevel = pastSeasons.bookLevel;

    const updater = await LevelsManager.update(pastSeasons, config.currentSeason);

    if (!updater) return;

    pastSeasons = updater.pastSeasons;

    const freeTier = await BattlepassManager.GetSeasonFreeRewards();
    const paidTier = await BattlepassManager.GetSeasonPaidRewards();

    const items: ItemOut[] = [];

    if (!freeTier || !paidTier) return;

    for (let i = originalBookLevel; i < pastSeasons.bookLevel; i++) {
      const paidTierRewards = paidTier.filter((tier) => tier.Tier === i);
      const freeTierRewards = freeTier.filter((tier) => tier.Tier === i);

      if (!paidTierRewards) continue;
      if (!freeTierRewards) continue;

      for (const tier of freeTierRewards) {
        if (!updater.canGrantItems) break;
        if (tier.Tier <= originalBookLevel) break;
        if (tier.Tier > pastSeasons.bookLevel) break;

        const { TemplateId: item, Quantity: quantity } = tier;
        const lowercaseItem = item.toLowerCase();

        const attributes = {
          max_level_bonus: 0,
          level: 1,
          item_seen: false,
          xp: 0,
          variants: [],
          favorite: false,
        };

        switch (true) {
          case lowercaseItem.startsWith("homebasebanner"):
          case lowercaseItem.startsWith("bannertoken"):
            items.push({
              templateId: item,
              type: "common_core",
              attributes,
              quantity,
            });
            break;

          case lowercaseItem.startsWith("athena"):
            items.push({
              templateId: item,
              type: "athena",
              attributes,
              quantity,
            });
            break;
          case lowercaseItem.startsWith("token:athenaseasonxpboost"):
            items.push({
              templateId: item,
              type: "athenaseasonxpboost",
              attributes,
              quantity,
            });
            break;
          case lowercaseItem.startsWith("token:athenaseasonfriendxpboost"):
            items.push({
              templateId: item,
              type: "athenaseasonfriendxpboost",
              attributes,
              quantity,
            });
            break;
          case lowercaseItem.startsWith("currency:mtxgiveaway"):
            items.push({
              templateId: "Currency:MtxPurchased",
              type: "common_core",
              attributes,
              quantity: quantity,
            });
            break;

          default:
            logger.warn(`Missing Reward: ${item}`);
        }
      }

      for (const tier of paidTier) {
        if (!updater.canGrantItems) break;
        if (!pastSeasons.purchasedVIP) break;
        if (tier.Tier <= originalBookLevel) break;
        if (tier.Tier > pastSeasons.bookLevel) break;

        const { TemplateId: item, Quantity: quantity } = tier;
        const lowercaseItem = item.toLowerCase();

        const attributes = {
          max_level_bonus: 0,
          level: 1,
          item_seen: false,
          xp: 0,
          variants: [],
          favorite: false,
        };

        switch (true) {
          case lowercaseItem.startsWith("homebasebanner"):
          case lowercaseItem.startsWith("bannertoken"):
            items.push({
              templateId: item,
              type: "common_core",
              attributes,
              quantity,
            });
            break;

          case lowercaseItem.startsWith("athena"):
            items.push({
              templateId: item,
              type: "athena",
              attributes,
              quantity,
            });
            break;
          case lowercaseItem.startsWith("token:athenaseasonxpboost"):
            items.push({
              templateId: item,
              type: "athenaseasonxpboost",
              attributes,
              quantity,
            });
            break;
          case lowercaseItem.startsWith("token:athenaseasonfriendxpboost"):
            items.push({
              templateId: item,
              type: "athenaseasonfriendxpboost",
              attributes,
              quantity,
            });
            break;
          case lowercaseItem.startsWith("currency:mtxgiveaway"):
            items.push({
              templateId: "Currency:MtxPurchased",
              type: "common_core",
              attributes,
              quantity: quantity,
            });
            break;
          case lowercaseItem.startsWith("cosmeticvarianttoken"):
            items.push({
              templateId: item,
              type: "athena",
              attributes,
              quantity,
            });
            break;

          default:
            logger.warn(`Missing Reward: ${item}`);
        }
      }
    }

    return {
      pastSeasons,
      items,
      canGrantItems: updater.canGrantItems,
    };
  }
}
