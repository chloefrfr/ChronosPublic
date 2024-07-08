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

    const applyProfileChanges: object[] = [];
    const { targetIndex, sourceIndex, optNewNameForTarget } = body;

    console.log(targetIndex);
    console.log(sourceIndex);

    if (targetIndex > 100 || sourceIndex > 100 || sourceIndex < 0 || targetIndex < 0) {
      return c.json(errors.createError(400, c.req.url, "Index out of bounds.", timestamp), 400);
    }

    // if (
    //   targetIndex >= athena.stats.attributes.loadouts.length ||
    //   sourceIndex >= athena.stats.attributes.loadouts.length
    // ) {
    //   return c.json(errors.createError(400, c.req.url, "Index out of bounds.", timestamp), 400);
    // }

    const targetLoadoutName = athena.stats.attributes.loadouts[targetIndex];
    const sourceLoadoutName = athena.stats.attributes.loadouts[sourceIndex];

    if (!athena.items[targetLoadoutName] || !athena.items[sourceLoadoutName]) {
      return c.json(errors.createError(400, c.req.url, "Failed to find loadout.", timestamp), 400);
    }

    if (optNewNameForTarget) {
      athena.items[targetLoadoutName].attributes.locker_name = optNewNameForTarget;
    }

    athena.items[targetLoadoutName].attributes.locker_slots_data = {
      ...athena.items[sourceLoadoutName].attributes.locker_slots_data,
    };

    console.log(athena.items[targetLoadoutName]);

    athena.stats.attributes.last_applied_loadout = targetLoadoutName;
    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updatedAt = new Date().toISOString();

    await Profiles.createQueryBuilder()
      .update()
      .set({ profile: athena })
      .where("type = :type", { type: "athena" })
      .andWhere("accountId = :accountId", { accountId: user.accountId })
      .execute();

    return c.json(MCPResponses.generate(athena, [], profileId));
  } catch (error) {
    logger.error(`CopyCosmeticLoadout: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
  }
}
