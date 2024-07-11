import type { Context } from "hono";
import errors from "../utilities/errors";
import { accountService, config, itemStorageService, logger, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import CreateProfileItem from "../utilities/CreateProfileItem";
import { Profiles } from "../tables/profiles";
import MCPResponses from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import type { Entries, ItemGrants } from "../shop/interfaces/Declarations";
import { v4 as uuid } from "uuid";
import { BattlepassManager } from "../utilities/managers/BattlepassManager";
import { LevelsManager } from "../utilities/managers/LevelsManager";

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

    const [profile, athena] = await Promise.all([
      ProfileHelper.getProfile(user.accountId, profileId),
      ProfileHelper.getProfile(user.accountId, "athena"),
    ]);

    if (!profile || !athena) {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} or athena not found.`, timestamp),
        404,
      );
    }

    const body = await c.req.json();
    const { currency, offerId, purchaseQuantity } = body;

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
          profile.items["Currency:MtxPurchased"].quantity
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

      profile.items["Currency:MtxPurchased"].quantity -=
        currentActiveStorefront.prices[0].finalPrice;

      multiUpdates.push({
        changeType: "itemQuantityChanged",
        itemId: "Currency:MtxPurchased",
        quantity: profile.items["Currency:MtxPurchased"].quantity,
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

      profile.stats.attributes.mtx_purchase_history.purchases.push(purchase);
      owned = true;
    } else {
      console.log(offerId);

      const storefrontBattlepass = await BattlepassManager.GetStorefrontBattlepass(uahelper.season);
      let isValidOffer: boolean = false;

      for await (const allEntries of storefrontBattlepass.catalogEntries) {
        if (allEntries.offerId === offerId) {
          logger.debug(`OfferId is valid.`);
          isValidOffer = true;
          break;
        }

        if (!isValidOffer)
          return c.json(
            errors.createError(
              404,
              c.req.url,
              `Invalid offerId '${allEntries.offerId}'`,
              timestamp,
            ),
            404,
          );

        for await (let pastSeasons of athena.stats.attributes.past_seasons) {
          if (pastSeasons.seasonNumber === config.currentSeason) {
            let currency = profile.items["Currency:MtxPurchased"];
            let finalPrice = allEntries.prices[0].finalPrice;

            logger.debug(`FinalPrice for ${allEntries.offerId} is '${finalPrice}'`);

            const { attributes } = athena.stats;

            if (pastSeasons.purchasedVIP && allEntries.devName.includes("SingleTier"))
              return c.json(
                errors.createError(
                  400,
                  c.req.url,
                  "You have not purchased the battlepass.",
                  timestamp,
                ),
                400,
              );

            if (!allEntries.devName.includes("SingleTier")) {
              currency.quantity -= finalPrice;
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
            }

            let originalBookLevel = pastSeasons.bookLevel;

            // if (allEntries.devName.includes("BattleBundle")) {
            //   pastSeasons.bookLevel = Math.min(pastSeasons.bookLevel + 25, 100);
            // } else if (allEntries.devName.includes("SingleTier")) {
            //   pastSeasons.bookLevel = Math.min(pastSeasons.bookLevel + purchaseQuantity, 100);
            // } else if (allEntries.devName.includes("BattlePass")) {
            //   pastSeasons.bookLevel = 1;
            // }

            if (allEntries.devName.includes("SingleTier")) {
              currency.price = purchaseQuantity * finalPrice;
              applyProfileChanges.push({
                changeType: "itemQuantityChanged",
                itemId: "Currency:MtxPurchased",
                quantity: currency.quantity,
              });
            }

            if (finalPrice > currency.price)
              return c.json(
                errors.createError(400, c.req.url, "You cannot afford this item.", timestamp),
                400,
              );

            const updater = await LevelsManager.update(pastSeasons);

            if (!updater) continue;

            pastSeasons = updater.pastSeasons;

            logger.debug(`canGrantItems: ${updater.canGrantItems}`);

            const freeTier = await BattlepassManager.GetSeasonFreeRewards();
            const paidTier = await BattlepassManager.GetSeasonPaidRewards();

            if (!freeTier || !paidTier) return;

            for (let i = originalBookLevel; i < pastSeasons.bookLevel; i++) {
              const paidTierRewards = paidTier.filter((tier) => tier.Tier === i);
              const freeTierRewards = freeTier.filter((tier) => tier.Tier === i);

              if (!paidTierRewards) continue;
              if (!freeTierRewards) continue;

              for (const rewards of freeTierRewards) {
                if (!updater.canGrantItems) break;
                if (rewards.Tier <= originalBookLevel) break;
                if (rewards.Tier > pastSeasons.bookLevel) break;

                switch (true) {
                  case rewards.TemplateId.startsWith("BannerToken"):
                  case rewards.TemplateId.startsWith("HomebaseBanner:"):
                    profile.items[rewards.TemplateId] = {
                      templateId: rewards.TemplateId,
                      attributes: {
                        item_seen: false,
                      },
                      quantity: rewards.Quantity,
                    };
                    break;
                  case rewards.TemplateId.startsWith("Athena"):
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
                    if (rewards.TemplateId.includes("athenaseasonfriendxpboost"))
                      athena.stats.attributes.season_friend_match_boost += rewards.Quantity;
                    else if (rewards.TemplateId.includes("athenaseasonxpboost"))
                      athena.stats.attributes.season_match_boost += rewards.Quantity;
                    break;
                  case rewards.TemplateId.startsWith("Currency:"):
                    currency.quantity += rewards.Quantity;
                    break;
                  case rewards.TemplateId.includes("CosmeticVariantToken:"):
                    const reward = await BattlepassManager.ClaimCosmeticVariantTokenReward(
                      rewards.TemplateId,
                      user!.accountId,
                    );

                    const addedVariants: object[] = [];

                    if (!reward) return;

                    addedVariants.push({
                      channel: reward.channel,
                      active: reward.value,
                      owned: [reward.value],
                    });

                    multiUpdates.push({
                      changeType: "itemAttrChanged",
                      itemId: reward.templateId,
                      attributeName: "variants",
                      attributeValue: addedVariants,
                    });

                    notifications.push({
                      itemType: reward.templateId,
                      itemGuid: reward.templateId,
                      quantity: rewards.Quantity,
                    });

                    break;

                  default:
                    logger.warn(`Missing reward: ${rewards.TemplateId} at tier ${rewards.Tier}`);
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
                if (!updater.canGrantItems) break;
                if (rewards.Tier <= originalBookLevel) break;
                if (rewards.Tier > pastSeasons.bookLevel) break;

                switch (true) {
                  case rewards.TemplateId.startsWith("BannerToken"):
                  case rewards.TemplateId.startsWith("HomebaseBanner:"):
                    profile.items[rewards.TemplateId] = {
                      templateId: rewards.TemplateId,
                      attributes: {
                        item_seen: false,
                      },
                      quantity: rewards.Quantity,
                    };
                    break;
                  case rewards.TemplateId.startsWith("Athena"):
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
                    if (rewards.TemplateId.includes("athenaseasonfriendxpboost"))
                      athena.stats.attributes.season_friend_match_boost += rewards.Quantity;
                    else if (rewards.TemplateId.includes("athenaseasonxpboost"))
                      athena.stats.attributes.season_match_boost += rewards.Quantity;
                    break;
                  case rewards.TemplateId.startsWith("Currency:"):
                    currency.quantity += rewards.Quantity;
                    break;
                  case rewards.TemplateId.includes("CosmeticVariantToken:"):
                    const reward = await BattlepassManager.ClaimCosmeticVariantTokenReward(
                      rewards.TemplateId,
                      user!.accountId,
                    );

                    const addedVariants: object[] = [];

                    if (!reward) return;

                    addedVariants.push({
                      channel: reward.channel,
                      active: reward.value,
                      owned: [reward.value],
                    });

                    multiUpdates.push({
                      changeType: "itemAttrChanged",
                      itemId: reward.templateId,
                      attributeName: "variants",
                      attributeValue: addedVariants,
                    });

                    notifications.push({
                      itemType: reward.templateId,
                      itemGuid: reward.templateId,
                      quantity: rewards.Quantity,
                    });

                    break;

                  default:
                    logger.warn(`Missing reward: ${rewards.TemplateId} at tier ${rewards.Tier}`);
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

            console.log(multiUpdates);
            console.log(notifications);
          }
        }
      }
    }

    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updatedAt = new Date().toISOString();

    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();

    await Promise.all([
      Profiles.createQueryBuilder()
        .update()
        .set({ profile })
        .where("type = :type", { type: "common_core" })
        .andWhere("accountId = :accountId", { accountId: user.accountId })
        .execute(),
      Profiles.createQueryBuilder()
        .update()
        .set({ profile: athena })
        .where("type = :type", { type: "athena" })
        .andWhere("accountId = :accountId", { accountId: user.accountId })
        .execute(),
    ]);

    const profileRevision = uahelper.buildUpdate >= "12.20" ? athena.commandRevision : athena.rvn;
    const queryRevision = parseInt(rvn) || 0;

    applyProfileChanges =
      queryRevision !== profileRevision ? [{ changeType: "fullProfileUpdate", profile }] : [];

    return c.json(
      MCPResponses.generatePurchaseResponse(
        profile,
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
