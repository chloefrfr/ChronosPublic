import type { Context } from "hono";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import {
  accountService,
  friendsService,
  itemStorageService,
  logger,
  profilesService,
  userService,
} from "..";
import { ShopHelper } from "../shop/helpers/shophelper";
import type { Entries } from "../shop/interfaces/Declarations";
import type { ProfileId } from "../utilities/responses";
import MCPResponses from "../utilities/responses";
import type { LootList } from "../bot/commands/grantall";
import { v4 as uuid } from "uuid";
import { handleProfileSelection } from "./QueryProfile";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";

const asyncForEach = async (array: any[], callback: Function) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

function findItemByOfferId(storefronts: any[], offerId: string): Entries | null {
  for (const section of storefronts) {
    const found = section.catalogEntries.find((entry: Entries) => entry.offerId === offerId);
    if (found) {
      return found;
    }
  }
  return null;
}

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  const applyProfileChanges: object[] = [];

  try {
    const [user, account, currentShop, body] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
      itemStorageService.getItemByType("storefront"),
      c.req.json(),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
        404,
      );
    }

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile && profileId !== "athena" && profileId !== "common_core") {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );
    }

    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );
    }

    if (!currentShop || !currentShop.data || !currentShop.data.storefronts) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to get storefront.", timestamp),
        400,
      );
    }

    const { offerId, receiverAccountIds, personalMessage, giftWrapTemplateId } = body;

    const currentItem = findItemByOfferId(currentShop.data.storefronts, offerId);
    if (!currentItem) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to get item from the current shop.", timestamp),
        400,
      );
    }

    if (personalMessage.length >= 100) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          "Personal message is longer than 100 characters.",
          timestamp,
        ),
        400,
      );
    }

    const friend = await friendsService.findFriendByAccountId(user.accountId);
    if (!friend) {
      return c.json(errors.createError(404, c.req.url, "Failed to find friend.", timestamp), 404);
    }

    let receiverAccountId: string = "";

    for (const id of receiverAccountIds) {
      receiverAccountId = id;
    }

    const receiverAccountIdsSet = new Set(receiverAccountIds);
    const accepted = friend.accepted.find((f) => receiverAccountIdsSet.has(f.accountId));
    if (!accepted && !receiverAccountIdsSet.has(accountId)) {
      return c.json(
        errors.createError(
          404,
          c.req.url,
          `User ${friend.accountId} is not friends with ${receiverAccountId}`,
          timestamp,
        ),
        404,
      );
    }

    const athena = await ProfileHelper.getProfile(user.accountId, "athena");
    if (!athena)
      return c.json(errors.createError(404, c.req.url, "Profile 'athena' not found.", timestamp));

    const finalPrice = currentItem.prices[0].finalPrice;
    const totalPrice = finalPrice * receiverAccountIds.length;

    for (const id in profile.items) {
      if (profile.items.hasOwnProperty(id)) {
        profile.items[id].quantity -= totalPrice;

        applyProfileChanges.push({
          changeType: "itemQuantityChanged",
          itemId: id,
          quantity: profile.items[id].quantity,
        });
      }
    }

    const receiverAthena = await ProfileHelper.getProfile(receiverAccountId, "athena");
    const receiverCommonCore = await ProfileHelper.getProfile(receiverAccountId, "common_core");

    if (!receiverAthena || !receiverCommonCore) {
      return c.json(errors.createError(404, c.req.url, `Profile not found.`, timestamp), 404);
    }

    for (const item in receiverAthena.items) {
      await asyncForEach(currentItem.itemGrants, async (grants: any) => {
        if (!receiverAthena.items[item]) return;

        const giftedItem = receiverAthena.items[grants.templateId];

        if (grants.templateId === giftedItem.templateId)
          return c.json(
            errors.createError(400, c.req.url, "User already owns this item.", timestamp),
            400,
          );

        const lootList: LootList[] = [
          {
            itemType: grants.templateId,
            itemGuid: grants.templateId,
            itemProfile: "athena",
            quantity: 1,
          },
        ];

        receiverCommonCore.stats.attributes.gifts?.push({
          templateId: giftWrapTemplateId,
          attributes: {
            fromAccountId: user.accountId,
            lootList,
            params: {
              userMessage: personalMessage,
            },
            giftedOn: new Date().toISOString(),
            level: 1,
          },
          quantity: 1,
        });

        SendMessageToId(
          JSON.stringify({
            payload: {},
            type: "com.epicgames.gift.received",
            timestamp: new Date().toISOString(),
          }),
          user.accountId,
        );
      });

      receiverAthena.rvn += 1;
      receiverAthena.commandRevision += 1;
      receiverAthena.updatedAt = new Date().toISOString();

      receiverCommonCore.rvn += 1;
      receiverCommonCore.commandRevision += 1;
      receiverCommonCore.updatedAt = new Date().toISOString();

      await Promise.all([
        profilesService.update(receiverAccountId, "athena", receiverAthena),
        profilesService.update(receiverAccountId, "common_core", receiverCommonCore),
      ]);
    }

    if (applyProfileChanges.length > 0) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      athena.rvn += 1;
      athena.commandRevision += 1;
      athena.updatedAt = new Date().toISOString();
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`GiftCatalogEntry: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp));
  }
}
