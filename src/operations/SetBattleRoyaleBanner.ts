import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import { Profiles } from "../tables/profiles";
import MCPResponses, { type ProfileId } from "../utilities/responses";

export default async function SetBattleRoyaleBanner(c: Context) {
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

    const { homebaseBannerIconId, homebaseBannerColorId } = body;
    const applyProfileChanges: object[] = [];

    if (homebaseBannerIconId !== null) {
      athena.items.sandbox_loadout.attributes.banner_icon_template = homebaseBannerIconId;
      athena.stats.attributes.banner_icon = homebaseBannerIconId;
      applyProfileChanges.push({
        changeType: "statModified",
        name: "banner_icon",
        value: homebaseBannerIconId,
      });
    }
    if (homebaseBannerColorId !== null) {
      athena.items.sandbox_loadout.attributes.banner_color_template = homebaseBannerColorId;
      athena.stats.attributes.banner_color = homebaseBannerColorId;
      applyProfileChanges.push({
        changeType: "statModified",
        name: "banner_color",
        value: homebaseBannerColorId,
      });
    }

    if (applyProfileChanges.length > 0) {
      athena.rvn += 1;
      athena.commandRevision += 1;
      athena.updatedAt = timestamp;
    }

    await profilesService.update(user.accountId, "athena", athena);

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`SetBattleRoyaleBanner: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
