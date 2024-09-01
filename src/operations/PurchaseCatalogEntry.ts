import type { Context } from "hono";
import errors from "../utilities/errors";
import {
  accountService,
  config,
  itemStorageService,
  logger,
  profilesService,
  userService,
} from "..";
import ProfileHelper from "../utilities/profiles";
import CreateProfileItem from "../utilities/CreateProfileItem";
import { Profiles } from "../tables/profiles";
import MCPResponses from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import type { BattlePassEntry, Entries, ItemGrants } from "../shop/interfaces/Declarations";
import { v4 as uuid } from "uuid";
import { BattlepassManager, type Rewards } from "../utilities/managers/BattlepassManager";
import { LevelsManager } from "../utilities/managers/LevelsManager";
import ProfilesService from "../wrappers/database/ProfilesService";
import type { Lootlist, Variants } from "../../types/profilesdefs";
import { QuestManager, QuestType, type Objectives } from "../utilities/managers/QuestManager";
import { object } from "zod";
import RefreshAccount from "../utilities/refresh";
import { handleProfileSelection } from "./QueryProfile";
import { BattlepassQuestGranter } from "../utilities/quests/BattlepassQuestGranter";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId");
  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  const useragent = c.req.header("User-Agent");
  if (!useragent) {
    return c.json(
      errors.createError(400, c.req.url, "'User-Agent' header is missing.", timestamp),
      400,
    );
  }

  const uahelper = uaparser(useragent);
  if (!uahelper) {
    return c.json(
      errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
      400,
    );
  }

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "User or account not found.", timestamp),
        404,
      );
    }

    const [common_core, athena] = await Promise.all([
      handleProfileSelection("common_core", user.accountId),
      handleProfileSelection("athena", user.accountId),
    ]);

    if (!common_core || !athena) {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} or athena not found.`, timestamp),
        404,
      );
    }

    const body = await c.req.json();
    let { currency, offerId, purchaseQuantity } = body;

    const notifications: object[] = [];
    const multiUpdates: object[] = [];
    let applyProfileChanges: object[] = [];

    let owned = false;

    if (currency !== "MtxCurrency" || profileId !== "common_core" || !offerId) {
      return c.json(errors.createError(400, c.req.url, "Invalid request.", timestamp), 400);
    }

    const currentShop = await itemStorageService.getItemByType("storefront");

    if (!currentShop || !currentShop.data || !currentShop.data.storefronts) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to get storefront.", timestamp),
        400,
      );
    }

    if (offerId.includes(":/")) {
      let currentActiveStorefront = null;
      for (const section of currentShop.data.storefronts) {
        const found = section.catalogEntries.find((entry: Entries) => entry.offerId === offerId);
        if (found) {
          currentActiveStorefront = found;
          break;
        }
      }

      if (!currentActiveStorefront) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            "Failed to get item from the current shop.",
            timestamp,
          ),
          400,
        );
      }

      if (purchaseQuantity < 1) {
        return c.json(
          errors.createError(400, c.req.url, "'purchaseQuantity' is less than 1.", timestamp),
          400,
        );
      }

      if (
        !owned &&
        currentActiveStorefront.prices[0].finalPrice >
          common_core.items["Currency:MtxPurchased"].quantity
      ) {
        return c.json(
          errors.createError(400, c.req.url, `You can not afford this item.`, timestamp),
          400,
        );
      }

      const alreadyOwned = currentActiveStorefront.itemGrants.some(
        (item: ItemGrants) => athena.items[item.templateId],
      );
      if (alreadyOwned) {
        return c.json(
          errors.createError(400, c.req.url, "You already own this item.", timestamp),
          400,
        );
      }

      const itemQuantitiesByTemplateId = new Map();
      const itemProfilesByTemplateId = new Map();

      for (const grant of currentActiveStorefront.itemGrants) {
        if (itemQuantitiesByTemplateId.has(grant.templateId)) {
          itemQuantitiesByTemplateId.set(
            grant.templateId,
            itemQuantitiesByTemplateId.get(grant.templateId) + grant.quantity,
          );
        } else {
          itemQuantitiesByTemplateId.set(grant.templateId, grant.quantity);
        }
        if (!itemProfilesByTemplateId.has(grant.templateId)) {
          itemProfilesByTemplateId.set(grant.templateId, "athena");
        }
      }

      itemQuantitiesByTemplateId.forEach((quantity, templateId) => {
        // @ts-ignore
        athena.items[templateId] = CreateProfileItem(templateId, quantity);

        multiUpdates.push({
          changeType: "itemAdded",
          itemId: templateId,
          item: athena.items[templateId],
        });

        notifications.push({
          itemType: templateId,
          itemGuid: templateId,
          itemProfile: "athena",
          quantity,
        });
      });

      common_core.items["Currency:MtxPurchased"].quantity -=
        currentActiveStorefront.prices[0].finalPrice;

      multiUpdates.push({
        changeType: "itemQuantityChanged",
        itemId: "Currency:MtxPurchased",
        quantity: common_core.items["Currency:MtxPurchased"].quantity,
      });

      const purchase = {
        purchaseId: uuid(),
        offerId: `v2:/${offerId}`,
        purchaseDate: new Date().toISOString(),
        undoTimeout: "9999-12-12T00:00:00.000Z",
        freeRefundEligible: false,
        fulfillments: [],
        lootResult: Object.keys(itemQuantitiesByTemplateId).map((templateId) => ({
          itemType: templateId,
          itemGuid: templateId,
          itemProfile: "athena",
          quantity: itemQuantitiesByTemplateId.get(templateId),
        })),
        totalMtxPaid: currentActiveStorefront.prices[0].finalPrice,
        metadata: {},
        gameContext: "",
      };

      common_core.stats.attributes.mtx_purchase_history!.purchases.push(purchase);
      owned = true;
    } else {
      const storefrontBattlepass = await BattlepassManager.GetStorefrontBattlepass(uahelper.season);

      let battlepassCatalogEntries: BattlePassEntry | undefined;

      const isValidOffer = storefrontBattlepass.catalogEntries.some((entry) => {
        const isMatchingEntry = entry.offerId === offerId;

        if (isMatchingEntry) battlepassCatalogEntries = entry;

        return isMatchingEntry;
      });

      if (!isValidOffer || !battlepassCatalogEntries) {
        return c.json(
          errors.createError(404, c.req.url, `Invalid offerId '${offerId}'`, timestamp),
          404,
        );
      }

      for await (let pastSeasons of athena.stats.attributes.past_seasons!) {
        let currency = common_core.items["Currency:MtxPurchased"];
        let finalPrice = storefrontBattlepass.catalogEntries.find(
          (entry) => entry.offerId === offerId,
        )?.prices[0]?.finalPrice;

        if (typeof finalPrice !== "number" || finalPrice <= 0) {
          return c.json(
            errors.createError(400, c.req.url, "Invalid or missing final price.", timestamp),
            400,
          );
        }
        const isBattlepass =
          battlepassCatalogEntries.devName === `BR.Season${config.currentSeason}.BattlePass.01`;
        const isSingleTier =
          battlepassCatalogEntries.devName === `BR.Season${config.currentSeason}.SingleTier.01`;
        const isBattleBundle =
          battlepassCatalogEntries.devName === `BR.Season${config.currentSeason}.BattleBundle.01`;

        let originalBookLevel = pastSeasons.bookLevel;

        if (!athena.stats.attributes.book_purchased && isSingleTier) {
          return c.json(
            errors.createError(400, c.req.url, "You have not purchased the battlepass.", timestamp),
            400,
          );
        }

        if (!isSingleTier) {
          for (const itemId in common_core.items) {
            if (common_core.items[itemId].quantity >= finalPrice) {
              common_core.items[itemId].quantity -= finalPrice;
            } else {
              common_core.items[itemId].quantity = 0;
            }

            applyProfileChanges.push({
              changeType: "itemQuantityChanged",
              itemId: "Currency:MtxPurchased",
              quantity: currency.quantity,
            });

            pastSeasons.purchasedVIP = true;
            multiUpdates.push({
              changeType: "statModified",
              name: "book_purchased",
              value: pastSeasons.purchasedVIP,
            });
            break;
          }
        }

        if (finalPrice > currency.quantity) {
          return c.json(
            errors.createError(400, c.req.url, "You cannot afford this item.", timestamp),
            400,
          );
        }

        if (isSingleTier) {
          if (purchaseQuantity <= 1) purchaseQuantity = 1;

          pastSeasons.bookLevel = Math.min(pastSeasons.bookLevel + purchaseQuantity, 100);
          pastSeasons.seasonLevel = Math.min(pastSeasons.seasonLevel + purchaseQuantity, 100);
        } else if (isBattlepass) {
          const tierCount = isBattleBundle ? 25 : 1;
          const rewards = await BattlepassManager.GetSeasonPaidRewards();

          const filteredRewards = rewards.filter((reward) => reward.Tier <= tierCount);

          for (const reward of filteredRewards) {
            const { TemplateId: item, Quantity: quantity } = reward;
            const itemLower = item.toLowerCase();

            if (itemLower.startsWith("athena")) {
              athena.items[item] = {
                quantity: quantity,
                attributes: {
                  favorite: false,
                  item_seen: false,
                  level: 1,
                  max_level_bonus: 0,
                  rnd_sel_cnt: 0,
                  variants: [],
                  xp: 0,
                },
                templateId: item,
              };
            } else if (itemLower.startsWith("token:athenaseasonxpboost")) {
              athena.stats.attributes.season_match_boost =
                (athena.stats.attributes.season_match_boost || 0) + quantity;
            } else if (itemLower.startsWith("token:athenaseasonfriendxpboost")) {
              athena.stats.attributes.season_friend_match_boost =
                (athena.stats.attributes.season_friend_match_boost || 0) + quantity;
            } else if (item.includes("athenaseasonfriendxpboost")) {
              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_friend_match_boost",
                item: athena.stats.attributes.season_friend_match_boost,
              });
            } else if (item.includes("athenaseasonxpboost")) {
              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_match_boost",
                item: athena.stats.attributes.season_match_boost,
              });
            } else if (
              itemLower.startsWith("bannertoken") ||
              itemLower.startsWith("homebasebanner")
            ) {
              multiUpdates.push({
                changeType: "itemAdded",
                itemId: item,
                item: common_core.items[item],
              });
            } else if (item.startsWith("ChallengeBundleSchedule")) {
              const granter = await BattlepassQuestGranter.grant(
                user.accountId,
                user.username,
                reward.TemplateId,
              );

              if (!granter || !granter.multiUpdates)
                return c.json(
                  errors.createError(400, c.req.url, "Failed to grant quests.", timestamp),
                  400,
                );

              multiUpdates.push(granter.multiUpdates);
            }

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: item,
              item: athena.items[item],
            });

            notifications.push({
              itemType: item,
              itemGuid: item,
              quantity: quantity,
            });

            pastSeasons.bookLevel = tierCount;
          }
        }
        const freeTier = await BattlepassManager.GetSeasonFreeRewards();
        const paidTier = await BattlepassManager.GetSeasonPaidRewards();

        if (!freeTier || !paidTier) return;

        for (let i = originalBookLevel; i < pastSeasons.bookLevel; i++) {
          const tierToMatch = isBattleBundle ? i : i + 1;

          const paidTierRewards = paidTier.filter((tier) => tier.Tier === tierToMatch);
          const freeTierRewards = freeTier.filter((tier) => tier.Tier === tierToMatch);

          if (paidTierRewards.length === 0 && freeTierRewards.length === 0) continue;

          for (const rewards of freeTierRewards) {
            switch (true) {
              case rewards.TemplateId.startsWith("BannerToken"):
              case rewards.TemplateId.startsWith("HomebaseBanner:"):
              case rewards.TemplateId.startsWith("HomebaseBannerIcon:"):
                common_core.items[rewards.TemplateId] = {
                  templateId: rewards.TemplateId,
                  attributes: { item_seen: false },
                  quantity: rewards.Quantity,
                };
                break;
              case rewards.TemplateId.startsWith("Athena"):
                // @ts-ignore
                athena.items[rewards.TemplateId] = {
                  attributes: {
                    favorite: false,
                    item_seen: false,
                    level: 1,
                    max_level_bonus: 0,
                    rnd_sel_cnt: 0,
                    variants: [],
                    xp: 0,
                  },
                  templateId: rewards.TemplateId,
                };
                break;
              case rewards.TemplateId.startsWith("Token:"):
                if (rewards.TemplateId.includes("athenaseasonfriendxpboost")) {
                  athena.stats.attributes.season_friend_match_boost! += rewards.Quantity;
                  multiUpdates.push({
                    changeType: "statModified",
                    itemId: "season_friend_match_boost",
                    item: athena.stats.attributes.season_friend_match_boost,
                  });
                } else if (rewards.TemplateId.includes("athenaseasonxpboost")) {
                  athena.stats.attributes.season_match_boost! += rewards.Quantity;
                  multiUpdates.push({
                    changeType: "statModified",
                    itemId: "season_match_boost",
                    item: athena.stats.attributes.season_match_boost,
                  });
                }
                break;
              case rewards.TemplateId.startsWith("Currency:"):
                currency.quantity += rewards.Quantity;
                break;
              case rewards.TemplateId.startsWith("ChallengeBundleSchedule:"):
                const granter = await BattlepassQuestGranter.grant(
                  user.accountId,
                  user.username,
                  rewards.TemplateId,
                );

                if (!granter || !granter.multiUpdates) continue;

                multiUpdates.push(granter.multiUpdates);
                break;

              default:
                logger.warn(`Missing reward: ${rewards.TemplateId} at tier ${rewards.Tier}`);
            }

            if (rewards.TemplateId.includes("athenaseasonfriendxpboost")) {
              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_friend_match_boost",
                item: athena.stats.attributes.season_friend_match_boost,
              });
            } else if (rewards.TemplateId.includes("athenaseasonxpboost")) {
              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_match_boost",
                item: athena.stats.attributes.season_match_boost,
              });
            } else if (
              rewards.TemplateId.toLowerCase().includes("athenatoken_brs13_umbrellaselection")
            ) {
              // @ts-ignore
              athena.items[rewards.TemplateId] = {
                attributes: {
                  favorite: false,
                  item_seen: false,
                  level: 1,
                  max_level_bonus: 0,
                  rnd_sel_cnt: 0,
                  variants: [],
                  xp: 0,
                },
                templateId: rewards.TemplateId,
              };
            } else if (
              rewards.TemplateId.startsWith("BannerToken") ||
              rewards.TemplateId.startsWith("HomebaseBanner")
            ) {
              multiUpdates.push({
                changeType: "itemAdded",
                itemId: rewards.TemplateId,
                item: common_core.items[rewards.TemplateId],
              });
            }

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: rewards.TemplateId,
              item: athena.items[rewards.TemplateId],
            });

            notifications.push({
              itemType: rewards.TemplateId,
              itemGuid: rewards.TemplateId,
              quantity: rewards.Quantity,
            });
          }

          for (const rewards of paidTierRewards) {
            switch (true) {
              case rewards.TemplateId.startsWith("BannerToken"):
              case rewards.TemplateId.startsWith("HomebaseBanner:"):
              case rewards.TemplateId.startsWith("HomebaseBannerIcon:"):
                common_core.items[rewards.TemplateId] = {
                  templateId: rewards.TemplateId,
                  attributes: { item_seen: false },
                  quantity: rewards.Quantity,
                };
                break;
              case rewards.TemplateId.startsWith("Athena"):
                athena.items[rewards.TemplateId] = {
                  quantity: rewards.Quantity,
                  attributes: {
                    favorite: false,
                    item_seen: false,
                    level: 1,
                    max_level_bonus: 0,
                    rnd_sel_cnt: 0,
                    variants: [],
                    xp: 0,
                  },
                  templateId: rewards.TemplateId,
                };
                break;
              case rewards.TemplateId.startsWith("Token:"):
                if (rewards.TemplateId.includes("athenaseasonfriendxpboost")) {
                  athena.stats.attributes.season_friend_match_boost! += rewards.Quantity;
                } else if (rewards.TemplateId.includes("athenaseasonxpboost")) {
                  athena.stats.attributes.season_match_boost! += rewards.Quantity;
                }

                athena.items[rewards.TemplateId] = {
                  quantity: rewards.Quantity,
                  attributes: {
                    favorite: false,
                    item_seen: false,
                    level: 1,
                    max_level_bonus: 0,
                    rnd_sel_cnt: 0,
                    variants: [],
                    xp: 0,
                  },
                  templateId: rewards.TemplateId,
                };
                break;
              case rewards.TemplateId.startsWith("Currency:"):
                currency.quantity += rewards.Quantity;
                break;
              case rewards.TemplateId.startsWith("CosmeticVariantToken"):
                const tokens = await BattlepassManager.GetCosmeticVariantTokenReward();

                logger.debug(`Attempting to find rewards for TemplateId: ${rewards.TemplateId}`);

                const vtidMapping: { [key: string]: string } = {
                  vtid_655_razerzero_styleb: "VTID_655_RazerZero_StyleB",
                  vtid_656_razerzero_stylec: "VTID_656_RazerZero_StyleC",
                  vtid_949_temple_styleb: "VTID_949_Temple_StyleB",
                  vtid_934_progressivejonesy_backbling_styleb:
                    "VTID_934_ProgressiveJonesy_Backbling_StyleB",
                  vtid_940_dinohunter_styleb: "VTID_940_DinoHunter_StyleB",
                  vtid_937_progressivejonesy_backbling_stylee:
                    "VTID_937_ProgressiveJonesy_Backbling_StyleE",
                  vtid_935_progressivejonesy_backbling_stylec:
                    "VTID_935_ProgressiveJonesy_Backbling_StyleC",
                  vtid_933_chickenwarrior_backbling_stylec:
                    "VTID_933_ChickenWarrior_Backbling_StyleC",
                  vtid_943_chickenwarrior_stylec: "VTID_943_ChickenWarrior_StyleC",
                  vtid_956_chickenwarriorglider_stylec: "VTID_956_ChickenWarriorGlider_StyleC",
                  vtid_936_progressivejonesy_backbling_styled:
                    "VTID_936_ProgressiveJonesy_Backbling_StyleD",
                  vtid_938_obsidian_styleb: "VTID_938_Obsidian_StyleB",
                };

                const reward =
                  tokens[vtidMapping[rewards.TemplateId.replace("CosmeticVariantToken:", "")]];
                if (!reward) {
                  continue;
                }

                logger.debug(`Successfully found rewards for TemplateId: ${rewards.TemplateId}`);

                let parts = reward.templateId.split(":");
                parts[1] = parts[1].toLowerCase();

                let templateId = parts.join(":");

                const Item = athena.items[templateId];
                if (!Item) continue;

                const newVariant = athena.items[templateId]?.attributes?.variants ?? [];

                const existingVariant = newVariant.find(
                  (variant) => variant.channel === reward.channel,
                );

                if (existingVariant) {
                  existingVariant.owned.push(reward.value);
                } else {
                  newVariant.push({
                    channel: reward.channel,
                    active: reward.value,
                    owned: [reward.value],
                  });
                }

                applyProfileChanges.push({
                  changeType: "itemAttrChanged",
                  itemId: reward.templateId,
                  attributeName: "variants",
                  attributeValue: newVariant,
                });

                break;
              case rewards.TemplateId.startsWith("ItemAccessToken"):
                athena.items[rewards.TemplateId] = {
                  quantity: rewards.Quantity,
                  attributes: {
                    favorite: false,
                    item_seen: false,
                    level: 1,
                    max_level_bonus: 0,
                    rnd_sel_cnt: 0,
                    variants: [],
                    xp: 0,
                  },
                  templateId: rewards.TemplateId,
                };
                break;
              case rewards.TemplateId.startsWith("ChallengeBundleSchedule:"):
                const granter = await BattlepassQuestGranter.grant(
                  user.accountId,
                  user.username,
                  rewards.TemplateId,
                );

                if (!granter || !granter.multiUpdates) continue;

                multiUpdates.push(granter.multiUpdates);
                break;

              default:
                logger.warn(`Missing reward: ${rewards.TemplateId} at tier ${rewards.Tier}`);
            }

            if (rewards.TemplateId.includes("athenaseasonfriendxpboost")) {
              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_friend_match_boost",
                item: athena.stats.attributes.season_friend_match_boost,
              });
            } else if (rewards.TemplateId.includes("athenaseasonxpboost")) {
              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_match_boost",
                item: athena.stats.attributes.season_match_boost,
              });
            } else if (
              rewards.TemplateId.startsWith("BannerToken") ||
              rewards.TemplateId.startsWith("HomebaseBanner")
            ) {
              multiUpdates.push({
                changeType: "itemAdded",
                itemId: rewards.TemplateId,
                item: common_core.items[rewards.TemplateId],
              });
            }

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: rewards.TemplateId,
              item: athena.items[rewards.TemplateId],
            });

            notifications.push({
              itemType: rewards.TemplateId,
              itemGuid: rewards.TemplateId,
              quantity: rewards.Quantity,
            });
          }
        }

        if (isSingleTier) currency.quantity -= finalPrice;

        const giftBoxTemplateId =
          uahelper.season >= 5 ? "GiftBox:gb_battlepasspurchased" : "GiftBox:gb_battlepass";

        applyProfileChanges.push([
          {
            changeType: "itemAttrChanged",
            itemId: "Currency:MtxPurchased",
            quantity: currency.quantity,
          },
        ]);

        multiUpdates.push([
          {
            changeType: "statModified",
            name: "book_level",
            value: pastSeasons.bookLevel,
          },
          {
            changeType: "statModified",
            name: "level",
            value: pastSeasons.seasonLevel,
          },
          {
            changeType: "itemQuantityChanged",
            itemId: "Currency",
            quantity: currency.quantity,
          },
        ]);

        common_core.stats.attributes.gifts?.push({
          templateId: giftBoxTemplateId,
          attributes: {
            lootList: notifications as Lootlist[],
          },
          quantity: 1,
        });

        const randomGiftBoxId = uuid();
        multiUpdates.push({
          changeType: "itemAdded",
          itemId: randomGiftBoxId,
          item: {
            templateId: giftBoxTemplateId,
            attributes: {
              max_level_bonus: 0,
              fromAccountId: "Server",
              lootList: notifications,
            },
            quantity: 1,
          },
        });
      }
    }

    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updatedAt = new Date().toISOString();

    common_core.rvn += 1;
    common_core.commandRevision += 1;
    common_core.updatedAt = new Date().toISOString();

    await profilesService.update(user.accountId, "common_core", common_core);
    await profilesService.update(user.accountId, "athena", athena);

    await RefreshAccount(user.accountId, user.username);

    const profileRevision = uahelper.buildUpdate >= "12.20" ? athena.commandRevision : athena.rvn;
    const queryRevision = parseInt(rvn) || 0;

    applyProfileChanges =
      queryRevision !== profileRevision
        ? [{ changeType: "fullProfileUpdate", profile: common_core }]
        : [];

    return c.json(
      MCPResponses.generatePurchaseResponse(
        common_core,
        athena,
        applyProfileChanges,
        multiUpdates,
        notifications,
        profileId,
      ),
    );
  } catch (error) {
    logger.error(`PurchaseCatalogEntry: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
