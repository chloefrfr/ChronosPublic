import type { Context } from "hono";
import errors from "../utilities/errors";
import { accountService, logger, profilesService, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import { Profiles } from "../tables/profiles";
import MCPResponses, { type ProfileId } from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";

// Define a type for the request body to improve type safety
interface UpdateProfileRequestBody {
  giftBoxItemId?: string;
  giftBoxItemIds?: string[];
}

export default async function updateProfile(c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(
      errors.createError(400, c.req.url, "Missing required parameters.", timestamp),
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
        errors.createError(404, c.req.url, "User or account not found.", timestamp),
        404,
      );
    }

    let body: UpdateProfileRequestBody;
    try {
      body = await c.req.json();
      if (body.giftBoxItemId && typeof body.giftBoxItemId !== "string") {
        return c.json(
          errors.createError(400, c.req.url, "Invalid type for giftBoxItemId.", timestamp),
          400,
        );
      }
      if (body.giftBoxItemIds && !Array.isArray(body.giftBoxItemIds)) {
        return c.json(
          errors.createError(400, c.req.url, "Invalid type for giftBoxItemIds.", timestamp),
          400,
        );
      }
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Invalid JSON body.", timestamp), 400);
    }

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

    const { giftBoxItemId, giftBoxItemIds } = body;
    const applyProfileChanges = [];
    let shouldUpdateProfile: boolean = false;

    if (giftBoxItemId) {
      delete profile.items[giftBoxItemId];

      applyProfileChanges.push({ changeType: "itemRemoved", itemId: giftBoxItemId });

      shouldUpdateProfile = true;
    }

    if (giftBoxItemIds) {
      giftBoxItemIds.forEach((itemId) => {
        delete profile.items[itemId];

        applyProfileChanges.push({ changeType: "itemRemoved", itemId });

        shouldUpdateProfile = true;
      });
    }

    if (shouldUpdateProfile) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();
    }

    await profilesService.updateMultiple([
      {
        accountId: user.accountId,
        data: profile,
        type: "common_core",
      },
    ]);

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`RemoveGiftBox: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
  }
}
