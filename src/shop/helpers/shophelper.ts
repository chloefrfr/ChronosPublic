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
