import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";

export default async function (c: Context) {
  const timestamp = new Date().toISOString();

  try {
    const accountId = c.req.param("accountId");
    const profileId = c.req.query("profileId") as ProfileId;

    const [user, athenaProfile, profile] = await Promise.all([
      userService.findUserByAccountId(accountId),
      handleProfileSelection("athena", accountId),
      profilesService.findByAccountId(accountId),
    ]);

    if (!user || !profile || !athenaProfile) {
      return c.json(
        errors.createError(400, c.req.url, "User, Profile, or Athena not found.", timestamp),
      );
    }

    const athena = athenaProfile || {
      items: {},
      rvn: 0,
      commandRevision: 0,
      updatedAt: new Date().toISOString(),
    };

    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON.", timestamp), 400);
    }

    const { itemIds } = body;

    const applyProfileChanges = [];
    let shouldUpdateProfile = false;

    const updatedItems = new Map<string, any>();

    for (const itemId of itemIds) {
      if (athena.items[itemId]) {
        if (athena.items[itemId].attributes) {
          if (!athena.items[itemId].attributes.item_seen) {
            athena.items[itemId].attributes.item_seen = true;
            applyProfileChanges.push({
              changeType: "itemAttrChanged",
              itemId,
              attributeName: "item_seen",
              attributeValue: true,
            });
            updatedItems.set(itemId, athena.items[itemId]);
            shouldUpdateProfile = true;
          }
        } else {
          athena.items[itemId].attributes = { item_seen: true };
          applyProfileChanges.push({
            changeType: "itemAttrChanged",
            itemId,
            attributeName: "item_seen",
            attributeValue: true,
          });
          updatedItems.set(itemId, athena.items[itemId]);
          shouldUpdateProfile = true;
        }
      } else {
        athena.items[itemId] = {
          templateId: itemId,
          attributes: {
            level: 1,
            item_seen: true,
            xp: 0,
            variants: [],
            favorite: false,
          },
          quantity: 1,
        };
        applyProfileChanges.push({
          changeType: "itemAdded",
          itemId,
          attributeName: "item_seen",
          attributeValue: true,
        });
        updatedItems.set(itemId, athena.items[itemId]);
        shouldUpdateProfile = true;
      }
    }

    if (shouldUpdateProfile) {
      athena.rvn += 1;
      athena.commandRevision += 1;
      athena.updatedAt = new Date().toISOString();

      const updatedProfile = { ...profile, athena };

      await profilesService.updateMultiple([
        {
          accountId: user.accountId,
          type: "athena",
          data: updatedProfile,
        },
      ]);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`MarkItemSeen: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
