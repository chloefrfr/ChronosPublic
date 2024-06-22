import type {
  BattlePassStorefront,
  Entries,
  ItemGrants,
  Shop,
  StorefrontNames,
  Storefronts,
} from "../interfaces/Declarations";
import { v4 as uuid } from "uuid";
import { createBattlePassEntryTemplate } from "./template";
import { ShopGenerator } from "../shop";

export namespace ShopHelper {
  export function createShop(): Shop {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    return {
      expiration: tomorrow.toISOString(),
      refreshIntervalHrs: 1,
      dailyPurchaseHrs: 24,
      storefronts: [],
    };
  }

  export function createStorefront(sectionName: string): Storefronts {
    return {
      name: sectionName,
      catalogEntries: [],
    };
  }

  export function push(shop: Shop, storefront: Storefronts) {
    shop.storefronts.push(storefront);
  }

  export function getCurrentShop(): Shop {
    return ShopGenerator.shop;
  }

  export function createBattlePassStorefront(
    shop: Shop,
    sectionName: string,
  ): BattlePassStorefront {
    return {
      name: sectionName,
      catalogEntries: [],
    };
  }
}
