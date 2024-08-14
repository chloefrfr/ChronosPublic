import type { Context } from "hono";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import { accountService, logger, profilesService, userService } from "..";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";
import type { FavoriteSlotName, Variants } from "../../types/profilesdefs";

export default async function (c: Context) {
  const startTimestamp = Date.now();

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
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(
          404,
          c.req.url,
          "Failed to find user or account.",
          new Date().toISOString(),
        ),
        404,
      );
    }

    const profile = await handleProfileSelection(profileId, user.accountId);
    if (!profile) {
      return c.json(
        errors.createError(
          404,
          c.req.url,
          `Profile '${profileId}' not found.`,
          new Date().toISOString(),
        ),
        404,
      );
    }

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Body isn't valid JSON" }, 400);
    }

    const { itemToSlot, indexWithinSlot, slotName, variantUpdates } = body;
    const itemAttributes = profile.items[itemToSlot]?.attributes || {};
    const variantsMap = new Map(
      (itemAttributes.variants || []).map((v: Variants) => [v.channel, v]),
    );

    variantUpdates.forEach((variant: Variants) => {
      if (variantsMap.has(variant.channel)) {
        // @ts-ignore
        variantsMap.get(variant.channel)!.active = variant.active;
      }
    });

    const updatedVariants = Array.from(variantsMap.values());
    let applyProfileChanges: object[] = [];
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
      profile.stats.attributes.loadouts![profile.stats.attributes.active_loadout_index!];
    const cosmeticTemplateId = profile.items[itemToSlot]?.templateId || itemToSlot;
    const favoriteSlotName = `favorite_${slotName.toLowerCase()}` as FavoriteSlotName;

    const slotUpdates: { [key: string]: (index: number, value: string) => void } = {
      Dance: (index, value) => {
        if (index >= 0 && index <= 5) {
          profile.stats.attributes.favorite_dance![index] = value;
          const slotData =
            profile.items[activeLoadoutId]?.attributes.locker_slots_data?.slots[slotName];
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
      ItemWrap: (index, value) => {
        if ((index >= 0 && index <= 7) || index === -1) {
          const favoriteArray = profile.stats.attributes.favorite_itemwraps;
          for (let i = 0; i < 7; i++) {
            favoriteArray![i] = itemToSlot;
            profile.items.sandbox_loadout.attributes.locker_slots_data!.slots.ItemWrap.items[i] =
              cosmeticTemplateId;
          }

          applyProfileChanges.push({
            changeType: "statModified",
            name: "favorite_itemwraps",
            value: favoriteArray,
          });
        }
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

    logger.info(`Execution time: ${Date.now() - startTimestamp} ms`);

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    void logger.error(`Error in EquipBattleRoyaleCustomization: ${error}`);
    return c.json(
      errors.createError(500, c.req.url, "Internal server error.", new Date().toISOString()),
      500,
    );
  }
}
