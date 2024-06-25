import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, logger, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import { Profiles } from "../tables/profiles";
import MCPResponses from "../utilities/responses";

export default async function (c: Context) {
  const startTimestamp = Date.now();

  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  let [user, account, profile] = await Promise.all([
    userService.findUserByAccountId(accountId),
    accountService.findUserByAccountId(accountId),
    ProfileHelper.getProfile(accountId, profileId),
  ]);

  if (!user || !account || !profile) {
    return c.json(
      errors.createError(404, c.req.url, "Failed to find user, account, or profile.", timestamp),
      404,
    );
  }

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  const { itemToSlot, lockerItem, category, slotIndex } = body;
  const slotData = profile.items[lockerItem]?.attributes.locker_slots_data;

  const applyProfileChanges: object[] = [];

  const updateFavoriteSlot = (slotName: string, items: any[]) => {
    if (slotData && slotData[slotName]) {
      slotData[slotName].items = items;
      profile.stats.attributes[`favorite_${slotName.toLowerCase()}`] = itemToSlot;
      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: lockerItem,
        attributeName: "locker_slots_data",
        attributeValue: profile.items[lockerItem].attributes.locker_slots_data,
      });
    }
  };

  const updateItemWrapSlot = () => {
    if (slotData && slotData.ItemWrap && slotIndex >= 0 && slotIndex <= 7) {
      slotData.ItemWrap.items[slotIndex] = itemToSlot;
      profile.stats.attributes.favorite_itemwraps[slotIndex] = itemToSlot;
      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: lockerItem,
        attributeName: "locker_slots_data",
        attributeValue: profile.items[lockerItem].attributes.locker_slots_data,
      });
    }
  };

  if (category === "Dance" && slotIndex >= 0 && slotIndex <= 5) {
    if (slotData && slotData.Dance) {
      slotData.Dance.items[slotIndex] = itemToSlot;
      profile.stats.attributes.favorite_dance[slotIndex] = itemToSlot;
      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: lockerItem,
        attributeName: "locker_slots_data",
        attributeValue: profile.items[lockerItem].attributes.locker_slots_data,
      });
    }
  } else if (category === "ItemWrap" && slotIndex >= 0 && slotIndex <= 7) {
    updateItemWrapSlot();
  } else if (slotIndex === -1) {
    updateItemWrapSlot();
  } else {
    return c.json(
      errors.createError(400, c.req.url, "Invalid category or slot index.", timestamp),
      400,
    );
  }

  if (applyProfileChanges.length > 0) {
    profile.rvn += 1;
    profile.commandRevision += 1;
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
}
