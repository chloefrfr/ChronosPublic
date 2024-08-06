import type { Context } from "hono";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import { accountService, logger, profilesService, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import { Account } from "../tables/account";
import { Profiles } from "../tables/profiles";
import { handleProfileSelection } from "./QueryProfile";
import type { FavoritePropAttributes, FavoriteSlotName, Variants } from "../../types/profilesdefs";

export default async function (c: Context) {
  const startTimestamp = Date.now();

  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  try {
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

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile && profileId !== "athena" && profileId !== "common_core") {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} not found.`, timestamp),
        404,
      );
    }

    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Body isn't valid JSON" }, 400);
    }

    const { itemToSlot, indexWithinSlot, slotName, variantUpdates } = body;
    const applyProfileChanges: object[] = [];
    let shouldUpdateProfile = false;

    if (profile.items[itemToSlot]) {
      const itemAttributes = profile.items[itemToSlot].attributes;
      const variants = itemAttributes.variants || [];
      for (const variant of variantUpdates) {
        const existingVariant = variants.find((v) => v.channel === variant.channel);
        if (existingVariant) {
          existingVariant.active = variant.active;
        }
      }

      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: itemToSlot,
        attributeName: "variants",
        attributeValue: variants,
      });
      shouldUpdateProfile = true;
    }

    const activeLoadoutId =
      profile.stats.attributes.loadouts![profile.stats.attributes.active_loadout_index!];
    const cosmeticTemplateId = profile.items[itemToSlot]?.templateId || itemToSlot;
    const favoriteSlotName = `favorite_${slotName.toLowerCase()}` as FavoriteSlotName;

    switch (slotName) {
      case "Dance":
        if (indexWithinSlot >= 0 && indexWithinSlot <= 5) {
          profile.stats.attributes.favorite_dance![indexWithinSlot] = itemToSlot;

          const activeLoadout = profile.items[activeLoadoutId];
          const slotData = activeLoadout?.attributes.locker_slots_data?.slots[slotName];
          if (Array.isArray(slotData?.items) && indexWithinSlot < slotData.items.length) {
            slotData.items[indexWithinSlot] = cosmeticTemplateId;
            applyProfileChanges.push({
              changeType: "statModified",
              name: favoriteSlotName,
              value: profile.stats.attributes.favorite_dance,
            });
            shouldUpdateProfile = true;
          }
        }
        break;

      case "ItemWrap":
        if (indexWithinSlot >= 0 && indexWithinSlot <= 7) {
          profile.stats.attributes.favorite_itemwraps!.fill(itemToSlot, 0, 7);
          profile.items.sandbox_loadout.attributes.locker_slots_data!.slots.ItemWrap.items.fill(
            cosmeticTemplateId,
            0,
            7,
          );

          applyProfileChanges.push({
            changeType: "statModified",
            name: favoriteSlotName,
            value: profile.stats.attributes.favorite_itemwraps,
          });
          shouldUpdateProfile = true;
        }
        break;

      default:
        profile.stats.attributes[favoriteSlotName] = itemToSlot;
        profile.items.sandbox_loadout.attributes.locker_slots_data!.slots[slotName].items =
          cosmeticTemplateId;

        applyProfileChanges.push({
          changeType: "statModified",
          name: favoriteSlotName,
          value: profile.stats.attributes[favoriteSlotName],
        });
        shouldUpdateProfile = true;
        break;
    }

    if (shouldUpdateProfile) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, "athena", profile);
    }

    const endTimestamp = Date.now();
    logger.info(`Execution time: ${endTimestamp - startTimestamp} ms`);

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    void logger.error(`Error in EquipBattleRoyaleCustomization: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
