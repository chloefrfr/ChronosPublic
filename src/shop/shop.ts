import fetch from "node-fetch";
import type { JSONResponse, CosmeticSet } from "./interfaces/FortniteAPI";
import { config, logger } from "..";
import { CosmeticTypes } from "./enums/CosmeticTypes";
import type {
  BattlePassEntry,
  BattlePassStorefront,
  ItemGrants,
  Set,
} from "./interfaces/Declarations";
import { ShopHelper } from "./helpers/shophelper";
import path from "node:path";
import { createBattlePassEntryTemplate, createItemEntryTemplate } from "./helpers/template";
import { v4 as uuid } from "uuid";
import getRandomWeightedIndex from "./functions/getRandomWeightedIndex";
import { itemTypeProbabilities, rarityProbabilities } from "../constants/probabilities";
import { setDisplayAsset, setNewDisplayAssetPath } from "./helpers/displayAssets";
import { getPrice } from "./helpers/itemprices";
import getRandomFullSetLength from "./functions/getRandomFullSetLength";

export namespace ShopGenerator {
  export const items: Record<string, JSONResponse> = {};
  export const sets: Record<string, Set> = {};
  export const shop = ShopHelper.createShop();

  export async function generate() {
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

      entry.offerId = uuid();
      entry.offerType = "StaticPrice";

      if (!randomItem.displayAssetPath)
        randomItem.displayAssetPath = setDisplayAsset(`DA_Daily_${randomItem.id}`);

      entry.displayAssetPath = randomItem.displayAssetPath.includes("DA_Daily")
        ? randomItem.displayAssetPath
        : setDisplayAsset(`DA_Daily_${randomItem.id}`);

      entry.metaInfo.push({ key: "DisplayAssetPath", value: entry.displayAssetPath });
      entry.metaInfo.push({
        key: "NewDisplayAssetPath",
        value: setNewDisplayAssetPath(`DAv2_${randomItem.id}`),
      });
      entry.metaInfo.push({ key: "TileSize", value: "Small" });
      entry.metaInfo.push({ key: "SectionId", value: "Daily" });

      entry.meta.NewDisplayAssetPath = setNewDisplayAssetPath(`DAv2_${randomItem.id}`);
      entry.meta.displayAssetPath = entry.displayAssetPath;
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

      daily.catalogEntries.push(entry);

      if (characters === 2) break;
    }

    /// TODO - Add a accurate minimum of items for S14 and below

    while (getRandomFullSetLength(weekly.catalogEntries) < 3) {
      const keys = Object.keys(sets);

      if (keys.length === 0) continue;

      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const randomSet = sets[randomKey];

      for (const item of randomSet.definition) {
        // if (item.type.backendValue !== "AthenaCharacter") continue;

        const entry = createItemEntryTemplate();

        entry.offerId = uuid();
        entry.offerType = "StaticPrice";

        if (!item.displayAssetPath)
          item.displayAssetPath = setDisplayAsset(`DA_Featured_${item.id}`);

        entry.displayAssetPath = item.displayAssetPath.includes("DA_Featured")
          ? item.displayAssetPath
          : setDisplayAsset(`DA_Featured_${item.id}`);

        entry.metaInfo.push({ key: "DisplayAssetPath", value: entry.displayAssetPath });
        entry.metaInfo.push({
          key: "NewDisplayAssetPath",
          value: setNewDisplayAssetPath(`DAv2_${item.id}`),
        });
        entry.metaInfo.push({ key: "TileSize", value: "Normal" });
        entry.metaInfo.push({ key: "SectionId", value: "Featured" });

        entry.meta.NewDisplayAssetPath = setNewDisplayAssetPath(`DAv2_${item.id}`);
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

        weekly.catalogEntries.push(entry);
      }
    }

    ShopHelper.push(shop, daily);
    ShopHelper.push(shop, weekly);
    ShopHelper.push(shop, battlepass as any satisfies BattlePassStorefront);

    logger.info("Successfully generated storefront.");
  }
}
