import type { Context } from "hono";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import { accountService, logger, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import { Account } from "../tables/account";
import { Profiles } from "../tables/profiles";

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
    let [user, account, profile] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
      ProfileHelper.getProfile(profileId),
    ]);

    if (!user || !account || !profile) {
      return c.json(
        errors.createError(404, c.req.url, "Failed to find user, account, or profile.", timestamp),
        404,
      );
    }

    const applyProfileChanges: object[] = [];

    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      return c.json({ error: "Body isn't valid JSON" }, 400);
    }

    const { itemToSlot, indexWithinSlot, slotName, variantUpdates } = body;

    const activeLoadoutId =
      profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];
    const cosmeticTemplateId = profile.items[itemToSlot]?.templateId || itemToSlot;

    if (slotName === "Dance" && indexWithinSlot >= 0 && indexWithinSlot <= 5) {
      profile.stats.attributes.favorite_dance[indexWithinSlot] = itemToSlot;

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
        favoriteArray[i] = itemToSlot;
        profile.items.sandbox_loadout.attributes.locker_slots_data!.slots.ItemWrap.items[i] =
          cosmeticTemplateId;
      }

      applyProfileChanges.push({
        changeType: "statModified",
        name: "favorite_itemwraps",
        value: favoriteArray,
      });
    } else {
      profile.stats.attributes[`favorite_${slotName.toLowerCase()}`] = itemToSlot;
      profile.items.sandbox_loadout.attributes.locker_slots_data!.slots[slotName].items =
        cosmeticTemplateId;

      applyProfileChanges.push({
        changeType: "statModified",
        name: `favorite_${slotName.toLowerCase()}`,
        value: profile.stats.attributes[`favorite_${slotName.toLowerCase()}`],
      });
    }

    if (applyProfileChanges.length > 0) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();
    }

    await Profiles.createQueryBuilder()
      .update()
      .set({ profile })
      .where("type = :type", { type: profileId })
      .execute();

    const endTimestamp = Date.now();

    const executionTimeMs = endTimestamp - startTimestamp;

    logger.info(`Execution time: ${executionTimeMs} ms`);

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    void logger.error(`Error in EquipBattleRoyaleCustomization: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
