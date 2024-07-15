import type { Context } from "hono";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import { accountService, profilesService, userService } from "..";
import type { ProfileId } from "../utilities/responses";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";

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

  const { itemIds, itemFavStatus } = body;

  for (const item in itemIds) {
    if (!profile.items[itemIds[item]]) continue;
    if (typeof itemFavStatus[item] !== "boolean") continue;

    profile.items[itemIds[item]].attributes.favorite = itemFavStatus[item];

    applyProfileChanges.push({
      changeType: "itemAttrChanged",
      itemId: itemIds[item],
      attributeName: "favorite",
      attributeValue: profile.items[itemIds[item]].attributes.favorite,
    });
  }

  if (applyProfileChanges.length > 0) {
    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();
  }

  await profilesService.update(user.accountId, "athena", profile);

  return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
}
