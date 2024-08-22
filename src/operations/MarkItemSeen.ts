import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";

export default async function (c: Context) {
  const timestamp = new Date().toISOString();

  try {
    const accountId = c.req.param("accountId");
    const profileId = c.req.query("profileId") as ProfileId;

    if (!accountId || !profileId) {
      return c.json(
        errors.createError(400, c.req.url, "Missing accountId or profileId.", timestamp),
        400,
      );
    }

    const [user, athena, profile] = await Promise.all([
      userService.findUserByAccountId(accountId),
      ProfileHelper.getProfile(accountId, "athena"),
      profilesService.findByAccountId(accountId),
    ]);

    if (!user || !profile || !athena) {
      return c.json(errors.createError(400, c.req.url, "User profile not found.", timestamp));
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return c.json(
        errors.createError(400, c.req.url, "Invalid or empty itemIds.", timestamp),
        400,
      );
    }

    const { itemIds } = body;
    const validItemIds = itemIds.filter((itemId: string) => athena.items[itemId]);

    if (validItemIds.length === 0) {
      return c.json(
        errors.createError(400, c.req.url, "Invalid or empty itemIds.", timestamp),
        400,
      );
    }

    let shouldUpdateProfile = false;
    const applyProfileChanges: object[] = [];
    for (let i = 0; i < validItemIds.length; i++) {
      const itemId = validItemIds[i];
      const athenaItem = athena.items[itemId];

      if (athenaItem?.attributes?.item_seen !== true) {
        athenaItem.attributes.item_seen = true;
        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId,
          attributeName: "item_seen",
          attributeValue: true,
        });
        shouldUpdateProfile = true;
      }
    }

    if (shouldUpdateProfile) {
      athena.rvn++;
      athena.commandRevision++;
      athena.updatedAt = timestamp;

      await profilesService.updateMultiple([
        {
          accountId: user.accountId,
          data: athena,
          type: "athena",
        },
      ]);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`MarkItemSeen Error: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
