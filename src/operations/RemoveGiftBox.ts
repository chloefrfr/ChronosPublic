import type { Context } from "hono";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import { accountService, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import { Profiles } from "../tables/profiles";
import MCPResponses from "../utilities/responses";

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

  const profile = await ProfileHelper.getProfile(user.accountId, profileId);

  if (!profile)
    return c.json(
      errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
      404,
    );

  const athena = await ProfileHelper.getProfile(user.accountId, "athena");
  if (!athena)
    return c.json(
      errors.createError(404, c.req.url, `Profile athena was not found.`, timestamp),
      404,
    );

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  const { giftBoxItemId, giftBoxItemIds } = body;

  const applyProfileChanges: object[] = [];

  if (giftBoxItemId && typeof giftBoxItemId === "string") {
    delete profile.items[giftBoxItemId];

    delete athena.items[giftBoxItemId];

    applyProfileChanges.push({
      changeType: "itemRemoved",
      itemId: giftBoxItemId,
    });
  }

  if (giftBoxItemIds && Array.isArray(giftBoxItemIds)) {
    giftBoxItemIds.forEach((itemId) => {
      delete profile.items[itemId];
      delete athena.items[itemId];

      applyProfileChanges.push({
        changeType: "itemRemoved",
        itemId,
      });
    });
  }

  if (applyProfileChanges.length > 0) {
    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();

    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updatedAt = new Date().toISOString();
  }

  await Profiles.createQueryBuilder()
    .update()
    .set({ profile })
    .where("type = :type", { type: "common_core" })
    .execute();

  await Profiles.createQueryBuilder()
    .update()
    .set({ profile: athena })
    .where("type = :type", { type: "athena" })
    .execute();

  return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
}
