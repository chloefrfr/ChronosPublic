import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, itemStorageService, logger, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import { ShopHelper } from "../shop/helpers/shophelper";
import type { Entries } from "../shop/interfaces/Declarations";
import CreateProfileItem from "../utilities/CreateProfileItem";
import { Account } from "../tables/account";
import uaparser from "../utilities/uaparser";
import MCPResponses from "../utilities/responses";
import { Profiles } from "../tables/profiles";
import {
  BattlepassManager,
  type Rewards,
  type SeasonXP,
} from "../utilities/managers/BattlepassManager";
import { v4 as uuid } from "uuid";
import { HTTPRequests } from "../utilities/requests";
import path from "node:path";
import { XmppService } from "../sockets/xmpp/saved/XmppServices";
import { XmppUtilities } from "../sockets/xmpp/utilities/XmppUtilities";

export interface Purchase {
  purchaseId: string;
  offerId: string;
  purchaseDate: string;
  undoTimeout: string;
  freeRefundEligible: boolean;
  fulfillments: any[];
  lootResult: LootResult[];
  totalMtxPaid: number;
  metadata: any;
  gameContext: string;
}

interface LootResult {
  itemType: string;
  itemGuid: string;
  bundledItems: string[];
  itemProfile: string;
  quantity: number;
}

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();
  const useragent = c.req.header("User-Agent");

  if (!useragent)
    return c.json(
      errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
      400,
    );

  const uahelper = uaparser(useragent);

  if (!uahelper)
    return c.json(
      errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
      400,
    );

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  const [user, account] = await Promise.all([
    userService.findUserByAccountId(accountId),
    accountService.findUserByAccountId(accountId),
  ]);

  if (!user || !account) {
    return c.json(
      errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
      404,
    );
  }

  const profile = await ProfileHelper.getProfile(user.accountId, profileId);

  if (!profile)
    return c.json(
      errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
      404,
    );

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  let { currency, offerId, purchaseQuantity } = await c.req.json();

  let applyProfileChanges: object[] = [];
  const notifications: object[] = [];
  const multiUpdates: object[] = [];

  let owned: boolean = false;

  const athena = await ProfileHelper.getProfile(user.accountId, "athena");

  if (!athena)
    return c.json(
      errors.createError(404, c.req.url, `Profile athena was not found.`, timestamp),
      404,
    );

  if (currency !== "MtxCurrency" && profileId !== "common_core" && !offerId)
    return c.json(errors.createError(400, c.req.url, "Invalid request.", timestamp), 400);

  if (currency !== "MtxCurrency" || profileId !== "common_core" || !offerId)
    return c.json(errors.createError(400, c.req.url, "Invalid request.", timestamp), 400);

  if (offerId.includes(":/")) {
    let currentActiveStorefront: Entries | null = null;
    const currentShop = await itemStorageService.getItemByType("storefront");

    if (!currentShop)
      return c.json(errors.createError(400, c.req.url, "Failed to get storefront", timestamp), 400);

    let sections: any = {
      BRDailyStorefront: [],
      BRWeeklyStorefront: [],
    };

    for (const section of currentShop.data.storefronts) {
      if (section.name === "BRDailyStorefront") {
        sections.BRDailyStorefront.push(...section.catalogEntries);
      } else if (section.name === "BRWeeklyStorefront") {
        sections.BRWeeklyStorefront.push(...section.catalogEntries);
      }
    }

    for (const storefront of [...sections.BRWeeklyStorefront, ...sections.BRDailyStorefront]) {
      if (storefront.offerId === offerId) {
        currentActiveStorefront = storefront;

        break;
      }
    }

    if (!currentActiveStorefront)
      return c.json(
        errors.createError(400, c.req.url, "Failed to get item from the current shop.", timestamp),
        400,
      );

    if (purchaseQuantity < 1)
      return c.json(
        errors.createError(400, c.req.url, "'purchaseQuantity' is less than 1.", timestamp),
        400,
      );

    // console.log(currentActive);

    if (
      !owned &&
      currentActiveStorefront.prices[0].finalPrice > profile.items["Currency:MtxPurchased"].quantity
    )
      return c.json(
        errors.createError(
          400,
          c.req.url,
          `You can not afford this item (${currentActiveStorefront.prices[0].finalPrice}).`,
          timestamp,
        ),
        400,
      );

    const isAlreadyOwned = currentActiveStorefront.itemGrants.filter(
      (item) => athena.items[item.templateId],
    );

    // logger.debug(`Grants Length: ${isAlreadyOwned.length}`);

    if (isAlreadyOwned.length > 0)
      return c.json(
        errors.createError(400, c.req.url, "You already own this item.", timestamp),
        400,
      );

    const itemProfilesByTemplateId: Map<string, string> = new Map();
    const itemQuantitiesByTemplateId: Map<string, number> = new Map();

    for (const grants of currentActiveStorefront.itemGrants) {
      if (itemQuantitiesByTemplateId.has(grants.templateId)) {
        itemQuantitiesByTemplateId.set(
          grants.templateId,
          itemQuantitiesByTemplateId.get(grants.templateId)! + grants.quantity,
        );
      } else {
        itemQuantitiesByTemplateId.set(grants.templateId, grants.quantity);
      }

      if (!itemProfilesByTemplateId.has(grants.templateId)) {
        itemProfilesByTemplateId.set(grants.templateId, "athena");
      }
    }

    itemQuantitiesByTemplateId.forEach((quantity, templateId) => {
      const profileType = itemProfilesByTemplateId.get(templateId)!;

      athena.items[templateId] = CreateProfileItem(templateId, quantity);

      multiUpdates.push({
        changeType: "itemAdded",
        itemId: templateId,
        item: athena.items[templateId],
      });

      notifications.push({
        itemType: templateId,
        itemGuid: templateId,
        itemProfile: profileType,
        quantity: quantity,
      });
    });

    profile.items["Currency:MtxPurchased"].quantity -= currentActiveStorefront.prices[0].finalPrice;

    applyProfileChanges.push({
      changeType: "itemQuantityChanged",
      itemId: "Currency:MtxPurchased",
      quantity: profile.items["Currency:MtxPurchased"].quantity,
    });

    const { purchases } = profile.stats.attributes.mtx_purchase_history;

    itemQuantitiesByTemplateId.forEach((quantity, templateId) => {
      const profileType = itemProfilesByTemplateId.get(templateId)!;

      const existingPurchaseIndex = purchases.findIndex(
        (purchase: Purchase) => purchase.lootResult[0].itemType === templateId,
      );

      if (existingPurchaseIndex !== -1) purchases.splice(existingPurchaseIndex, 1);

      purchases.push({
        purchaseId: templateId,
        offerId: `v2:/${offerId}`,
        purchaseDate: new Date().toISOString(),
        undoTimeout: "9999-12-12T00:00:00.000Z",
        freeRefundEligible: false,
        fulfillments: [],
        lootResult: [
          {
            itemType: templateId,
            itemGuid: templateId,
            itemProfile: profileType,
            quantity,
          },
        ],
        totalMtxPaid: currentActiveStorefront.prices[0].finalPrice,
        metadata: {},
        gameContext: "",
      });
    });

    owned = true;
  }

  if (multiUpdates.length > 0) {
    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updatedAt = new Date().toISOString();
  }

  if (applyProfileChanges.length > 0) {
    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();
  }

  await Profiles.createQueryBuilder()
    .update()
    .set({ profile })
    .where("type = :type", { type: "common_core" })
    .andWhere("accountId = :accountId", { accountId: user.accountId })
    .execute();

  await Profiles.createQueryBuilder()
    .update()
    .set({ profile: athena })
    .where("type = :type", { type: "athena" })
    .andWhere("accountId = :accountId", { accountId: user.accountId })
    .execute();

  const profileRevision = uahelper!.buildUpdate >= "12.20" ? athena.commandRevision : athena.rvn;
  const queryRevision = c.req.query("rvn") || 0;

  if (queryRevision !== profileRevision) {
    applyProfileChanges = [
      {
        changeType: "fullProfileUpdate",
        profile,
      },
    ];
  }

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
}
