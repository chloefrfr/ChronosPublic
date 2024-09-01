import fetch from "node-fetch";
import fs from "node:fs/promises";
import type { JSONResponse, CosmeticSet } from "./interfaces/FortniteAPI";
import { config, logger } from "..";
import { CosmeticTypes } from "./enums/CosmeticTypes";
import type { BattlePassEntry, BattlePassStorefront, Set, Shop } from "./interfaces/Declarations";
import { ShopHelper } from "./helpers/shophelper";
import path from "node:path";
import { createBattlePassEntryTemplate, createItemEntryTemplate } from "./helpers/template";
import { v4 as uuid } from "uuid";
import { setDisplayAsset, setNewDisplayAssetPath } from "./helpers/displayAssets";
import { getPrice } from "./helpers/itemprices";
import getRandomFullSetLength from "./functions/getRandomFullSetLength";
import { matchRegex } from "./functions/regex";

export namespace ShopGenerator {
  export function createShop(): Shop {
    const date = new Date();

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + 1);

    const expiration = date.toISOString();

    return {
      expiration: expiration.toString(),
      refreshIntervalHrs: 1,
      dailyPurchaseHrs: 24,
      storefronts: [],
    };
  }

  export const items: Record<string, JSONResponse> = {};
  export const sets: Record<string, Set> = {};
  export const shop = createShop();

  export async function generate() {
    const date = new Date().toISOString().split("T")[0];

    const request = await fetch("https://fortnite-api.com/v2/cosmetics/br").then(
      async (res) => (await res.json()) as any,
    );

    const cosmeticTypes: Record<string, CosmeticTypes> = {};

    const response = request.data as JSONResponse[];
    response.map(async (json) => {
      if (
        !json.introduction ||
        json.introduction.backendValue > config.currentSeason ||
        json.introduction.backendValue === 0 ||
        json.set === null ||
        !json.shopHistory
      )
        return;

      if (json.shopHistory === null || json.shopHistory.length === 0) return;

      const itemType = json.type && typeof json.type === "object" ? json.type.backendValue : null;

      if (itemType && cosmeticTypes[itemType] !== undefined) {
        json.type.backendValue = cosmeticTypes[itemType];
      }

      if (!itemType) return;

      if (!sets[json.set.backendValue]) {
        sets[json.set.backendValue] = {
          value: json.set.value,
          text: json.set.text,
          definition: [],
        };
      }

      sets[json.set.backendValue].definition.push(json);
      items[json.id] = json;
    });

    const displayAssets: Record<string, any> = await Bun.file(
      path.join(__dirname, "..", "memory", "displayAssets.json"),
    ).json();

    for (const asset of Object.values(displayAssets)) {
      const assetParts = asset.split("_").slice(1);
      const itemKey = assetParts.join("_");
      let item: JSONResponse | undefined = items[itemKey];

      if (!item && assetParts[0].includes("CID")) {
        const match = matchRegex(itemKey);

        if (match) {
          item = Object.values(items).find((item) =>
            item.type.backendValue.includes("AthenaCharacter"),
          );
        }
      }

      if (item) {
        item.NewDisplayAssetPath = asset;
      }
    }

    Object.values(items)
      .filter(
        (item) => item.type.backendValue.includes("AthenaBackpack") && item.itemPreviewHeroPath,
      )
      .forEach((item) => {
        const cosmeticId = item.itemPreviewHeroPath.split("/").at(-1);
        if (!cosmeticId) return;
        const cosmetic = items[cosmeticId];
        if (cosmetic) {
          cosmetic.backpack = item;
        }
      });

    const daily = ShopHelper.createStorefront("BRDailyStorefront");
    const weekly = ShopHelper.createStorefront("BRWeeklyStorefront");
    const battlepass = ShopHelper.createBattlePassStorefront(
      shop,
      `BRSeason${config.currentSeason}`,
    );

    try {
      const BRSeasonJSON = await Bun.file(
        path.join(__dirname, "..", "memory", "storefront", `BRSeason${config.currentSeason}.json`),
      ).json();

      BRSeasonJSON.catalogEntries.forEach((entryData: BattlePassEntry) => {
        let battlepassOffer: any = createBattlePassEntryTemplate();

        battlepassOffer = entryData;

        battlepass.catalogEntries.push(battlepassOffer);
      });
    } catch (error) {
      void logger.error(`Failed to push battlepass data: ${error}`);
      throw error;
    }

    while (daily.catalogEntries.length < 6) {
      const keys = Object.keys(items);
      let characters: number = 0;
      let dances: number = 0;

      if (keys.length === 0) continue;

      let randomKey: string;
      let randomItem: any;

      do {
        randomKey = keys[Math.floor(Math.random() * keys.length)];
        randomItem = items[randomKey];
      } while ( // Blocked items from being generated.
        randomItem.type.backendValue === "AthenaBackpack" ||
        randomItem.type.backendValue === "AthenaSkyDiveContrail" ||
        randomItem.type.backendValue === "AthenaMusicPack" ||
        randomItem.type.backendValue === "AthenaToy"
      );

      if (randomItem.type.backendValue === "AthenaCharacter") {
        if (characters < 2) characters++;
        else continue;
      }

      const entry = createItemEntryTemplate();

      entry.offerId = `:/${uuid()}`;
      entry.offerType = "StaticPrice";

      entry.metaInfo.push({ key: "TileSize", value: "Small" });
      entry.metaInfo.push({ key: "SectionId", value: "Daily" });

      entry.meta.SectionId = "Daily";
      entry.meta.TileSize = "Small";

      entry.requirements.push({
        requirementType: "DenyOnItemOwnership",
        requiredId: `${randomItem.type.backendValue}:${randomItem.id}`,
        minQuantity: 1,
      });

      entry.refundable = true;
      entry.giftInfo.bIsEnabled = true;
      entry.giftInfo.forcedGiftBoxTemplateId = "";
      entry.giftInfo.purchaseRequirements = entry.requirements;
      entry.giftInfo.giftRecordIds = [];

      const price = getPrice(randomItem);

      if (!price) continue;

      entry.prices.push({
        currencySubType: "Currency",
        currencyType: "MtxCurrency",
        dynamicRegularPrice: -1,
        saleExpiration: "9999-12-31T23:59:59.999Z",
        basePrice: price,
        regularPrice: price,
        finalPrice: price,
      });
      entry.devName = `[VIRTUAL] 1x ${randomItem.type.backendValue}:${randomItem.id} for ${price} MtxCurrency`;

      entry.itemGrants.push({
        templateId: `${randomItem.type.backendValue}:${randomItem.id}`,
        quantity: 1,
      });

      if (randomItem.backpack) {
        entry.itemGrants.push({
          templateId: `${randomItem.backpack.type.backendValue}:${randomItem.backpack.id}`,
          quantity: 1,
        });

        entry.requirements.push({
          requirementType: "DenyOnItemOwnership",
          requiredId: `${randomItem.backpack.type.backendValue}:${randomItem.backpack.id}`,
          minQuantity: 1,
        });
      }

      daily.catalogEntries.push(entry);

      if (characters === 2) break;
    }

    let minimumWeeklyItems: number = 2;

    if (config.currentSeason >= 1 && config.currentSeason <= 8) minimumWeeklyItems = 2;
    else if (config.currentSeason >= 9 && config.currentSeason <= 13) minimumWeeklyItems = 3;
    else minimumWeeklyItems = 5;

    while (getRandomFullSetLength(weekly.catalogEntries) < minimumWeeklyItems) {
      const keys = Object.keys(sets);

      if (keys.length === 0) continue;

      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const randomSet = sets[randomKey];

      for (const item of randomSet.definition) {
        const entry = createItemEntryTemplate();

        entry.offerId = `v2:/${uuid()}`;
        entry.offerType = "StaticPrice";

        if (!item.displayAssetPath) item.displayAssetPath = setDisplayAsset(`DA_Daily_${item.id}`);
        else if (!item.NewDisplayAssetPath) item.NewDisplayAssetPath = "";
        // else if (!randomItem.newDisplayAssetPath)
        //   randomItem.newDisplayAssetPath = setNewDisplayAssetPath(`DAv2_${randomItem.id}`);

        entry.displayAssetPath = item.displayAssetPath.includes("DA_Daily")
          ? item.displayAssetPath
          : setDisplayAsset(`DA_Daily_${item.id}`);
        entry.NewDisplayAssetPath = item.NewDisplayAssetPath;

        entry.metaInfo.push({ key: "DisplayAssetPath", value: entry.displayAssetPath });
        entry.metaInfo.push({
          key: "NewDisplayAssetPath",
          value: entry.NewDisplayAssetPath,
        });
        entry.metaInfo.push({ key: "TileSize", value: "Normal" });
        entry.metaInfo.push({ key: "SectionId", value: "Featured" });

        entry.meta.NewDisplayAssetPath = entry.NewDisplayAssetPath;
        entry.meta.displayAssetPath = entry.displayAssetPath;
        entry.meta.SectionId = "Featured";
        entry.meta.TileSize = "Normal";

        entry.requirements.push({
          requirementType: "DenyOnItemOwnership",
          requiredId: `${item.type.backendValue}:${item.id}`,
          minQuantity: 1,
        });

        entry.refundable = true;
        entry.giftInfo.bIsEnabled = true;
        entry.giftInfo.forcedGiftBoxTemplateId = "";
        entry.giftInfo.purchaseRequirements = entry.requirements;
        entry.giftInfo.giftRecordIds = [];

        entry.categories.push(item.set.backendValue);

        const price = getPrice(item);

        if (!price) continue;

        entry.prices.push({
          currencySubType: "Currency",
          currencyType: "MtxCurrency",
          dynamicRegularPrice: -1,
          saleExpiration: "9999-12-31T23:59:59.999Z",
          basePrice: price,
          regularPrice: price,
          finalPrice: price,
        });
        entry.devName = `[VIRTUAL] 1x ${item.type.backendValue}:${item.id} for ${price} MtxCurrency`;

        entry.itemGrants.push({
          templateId: `${item.type.backendValue}:${item.id}`,
          quantity: 1,
        });

        if (item.backpack) {
          entry.itemGrants.push({
            templateId: `${item.backpack.type.backendValue}:${item.backpack.id}`,
            quantity: 1,
          });

          entry.requirements.push({
            requirementType: "DenyOnItemOwnership",
            requiredId: `${item.backpack.type.backendValue}:${item.backpack.id}`,
            minQuantity: 1,
          });
        }

        weekly.catalogEntries.push(entry);
      }
    }

    ShopHelper.push(shop, daily);
    ShopHelper.push(shop, weekly);
    ShopHelper.push(shop, battlepass as any satisfies BattlePassStorefront);
  }
}
