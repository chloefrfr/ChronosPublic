import type { Context } from "hono";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import { accountService, logger, profilesService, userService } from "..";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";
import type { FavoriteSlotName, Variants } from "../../types/profilesdefs";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  if (!accountId || !rvn || !profileId) {
    return c.json(
      errors.createError(400, c.req.url, "Missing query parameters.", new Date().toISOString()),
      400,
    );
  }

  try {
    const [user, account, profile] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
      handleProfileSelection(profileId, accountId),
    ]);

    if (!user || !account || !profile) {
      return c.json(
        errors.createError(
          404,
          c.req.url,
          "User, Account, or Profile not found.",
          new Date().toISOString(),
        ),
        404,
      );
    }

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body." }, 400);
    }

    const { itemToSlot, indexWithinSlot, slotName, variantUpdates } = body;
    const itemAttributes = profile.items[itemToSlot]?.attributes || {};
    const variantsMap = new Map(
      itemAttributes.variants?.map((v: Variants) => [v.channel, v]) || [],
    );

    for (const variant of variantUpdates) {
      const existingVariant = variantsMap.get(variant.channel);
      if (existingVariant) {
        existingVariant.active = variant.active;
      }
    }

    const updatedVariants = Array.from(variantsMap.values());
    const applyProfileChanges: object[] = [];
    let shouldUpdateProfile = false;

    if (profile.items[itemToSlot]) {
      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: itemToSlot,
        attributeName: "variants",
        attributeValue: updatedVariants,
      });
      shouldUpdateProfile = true;
    }

    const activeLoadoutId =
      profile.stats.attributes.loadouts?.[profile.stats.attributes.active_loadout_index!];
    const cosmeticTemplateId = profile.items[itemToSlot]?.templateId || itemToSlot;
    const favoriteSlotName = `favorite_${slotName.toLowerCase()}` as FavoriteSlotName;

    if (!activeLoadoutId) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          "'active_loadout_index' is undefined.",
          new Date().toISOString(),
        ),
        400,
      );
    }

    const slotUpdates: Record<string, (index: number, value: string) => void> = {
      Dance: (index, value) => {
        if (index >= 0 && index <= 5) {
          profile.stats.attributes.favorite_dance![index] = value;
          const slotData =
            profile.items[activeLoadoutId!]?.attributes.locker_slots_data?.slots[slotName];
          if (Array.isArray(slotData?.items) && index < slotData.items.length) {
            slotData.items[index] = cosmeticTemplateId;
            applyProfileChanges.push({
              changeType: "statModified",
              name: favoriteSlotName,
              value: profile.stats.attributes.favorite_dance,
            });
          }
        }
      },
      ItemWrap: () => {
        const favoriteArray = profile.stats.attributes.favorite_itemwraps!;
        for (let i = 0; i < 7; i++) {
          favoriteArray[i] = itemToSlot;
          profile.items.sandbox_loadout.attributes.locker_slots_data!.slots.ItemWrap.items[i] =
            cosmeticTemplateId;
        }

        applyProfileChanges.push({
          changeType: "statModified",
          name: "favorite_itemwraps",
          value: favoriteArray,
        });
      },
      default: () => {
        profile.stats.attributes[favoriteSlotName] = itemToSlot;
        profile.items.sandbox_loadout.attributes.locker_slots_data!.slots[slotName].items =
          cosmeticTemplateId;
        applyProfileChanges.push({
          changeType: "statModified",
          name: favoriteSlotName,
          value: profile.stats.attributes[favoriteSlotName],
        });
      },
    };

    (slotUpdates[slotName] || slotUpdates.default)(indexWithinSlot, itemToSlot);

    if (shouldUpdateProfile) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();

      await profilesService.updateMultiple([
        {
          accountId: user.accountId,
          type: "athena",
          data: profile,
        },
      ]);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`Error in EquipBattleRoyaleCustomization: ${error}`);
    return c.json(
      errors.createError(500, c.req.url, "Internal server error.", new Date().toISOString()),
      500,
    );
  }
}
