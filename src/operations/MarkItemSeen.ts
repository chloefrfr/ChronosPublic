import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import { Profiles } from "../tables/profiles";
import MCPResponses from "../utilities/responses";

export default async function (c: Context) {
  const timestamp = new Date().toISOString();

  try {
    const accountId = c.req.param("accountId");
    const profileId = c.req.query("profileId") as ProfileId;

    const [user, athena, profile] = await Promise.all([
      userService.findUserByAccountId(accountId),
      ProfileHelper.getProfile(accountId, "athena"),
      profilesService.findByAccountId(accountId),
    ]);

    if (!user || !profile || !athena) {
      return c.json(
        errors.createError(400, c.req.url, "User, Profile, or Athena not found.", timestamp),
      );
    }

    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON.", timestamp), 400);
    }

    const applyProfileChanges = [];
    const { itemIds } = body;

    for (const item of itemIds) {
      if (athena.items[item] && athena.items[item].attributes) {
        athena.items[item].attributes.item_seen = true;

        applyProfileChanges.push({
          changeType: "itemAttrChanged",
          itemId: item,
          attributeName: "item_seen",
          attributeValue: athena.items[item].attributes.item_seen,
        });
      }
    }

    if (applyProfileChanges.length > 0) {
      athena.rvn += 1;
      athena.commandRevision += 1;
      athena.updatedAt = new Date().toISOString();

      await Profiles.createQueryBuilder()
        .update()
        .set({ profile: athena })
        .where("type = :type", { type: "athena" })
        .execute();
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`MarkItemSeen: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
