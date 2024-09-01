import type { Context } from "hono";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import { accountService, profilesService, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import { Profiles } from "../tables/profiles";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";
import type { FavoriteSlotName } from "../../types/profilesdefs";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();

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

  const applyProfileChanges: object[] = [];

  const profile = await handleProfileSelection(profileId, user.accountId);

  if (!profile && profileId !== "athena" && profileId !== "common_core")
    return c.json(
      errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
      404,
    );

  if (!profile)
    return c.json(
      errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
      404,
    );

  let body;

  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  const { loadoutData } = body;

  if (loadoutData.length > 20)
    return c.json(
      errors.createError(
        400,
        c.req.url,
        "loadoutData can only be a maximum of 20 items.",
        timestamp,
      ),
      400,
    );

  for (let i = 0; i < loadoutData.length; i++) {
    const body = loadoutData[i];

    const { slotName, indexWithinSlot, itemToSlot } = body;

    const cosmeticTemplateId = profile.items[itemToSlot]?.templateId || itemToSlot;
    const activeLoadoutId =
      profile.stats.attributes.loadouts![profile.stats.attributes.active_loadout_index!];

    if (slotName === "Dance" && indexWithinSlot >= 0 && indexWithinSlot <= 5) {
      profile.stats.attributes.favorite_dance![indexWithinSlot] = itemToSlot;

      const activeLoadout = profile.items[activeLoadoutId];
      if (activeLoadout?.attributes.locker_slots_data) {
        const { locker_slots_data } = activeLoadout.attributes;
        const slotData = locker_slots_data.slots[slotName];

        if (Array.isArray(slotData.items) && indexWithinSlot < slotData.items.length) {
          slotData.items[indexWithinSlot] = cosmeticTemplateId;
        }

        applyProfileChanges.push({
          changeType: "statModified",
          name: `favorite_${slotName.toLowerCase()}`,
          value: profile.stats.attributes.favorite_dance,
        });
      }
    } else if (
      (slotName === "ItemWrap" && indexWithinSlot >= 0 && indexWithinSlot <= 7) ||
      indexWithinSlot === -1
    ) {
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
    } else {
      const favoriteSlotName = `favorite_${slotName.toLowerCase()}` as FavoriteSlotName;

      profile.stats.attributes[favoriteSlotName] = itemToSlot;
      profile.items.sandbox_loadout.attributes.locker_slots_data!.slots[slotName].items =
        cosmeticTemplateId;

      applyProfileChanges.push({
        changeType: "statModified",
        name: `favorite_${slotName.toLowerCase()}`,
        value: profile.stats.attributes[favoriteSlotName],
      });
    }
  }

  if (applyProfileChanges.length > 0) {
    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();
  }

  await profilesService.update(user.accountId, "athena", profile);

  return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
}
