import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, userService } from "..";
import ProfileHelper from "../utilities/profiles";
import MCPResponses from "../utilities/responses";
import { Account } from "../tables/account";
import { Profiles } from "../tables/profiles";

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

  const profile = await ProfileHelper.getProfile(profileId);

  if (!profile)
    return c.json(
      errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
      404,
    );

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  const { newPlatform } = body;

  if (!newPlatform)
    return c.json(
      errors.createError(400, c.req.url, `The parameter 'newPlatform' is missing.`, timestamp),
      400,
    );

  for (const item in profile.items) {
    profile.items[item].attributes.platform = newPlatform;
    profile.stats.attributes.current_mtx_platform = newPlatform;
  }

  profile.rvn += 1;
  profile.commandRevision += 1;
  profile.updatedAt = new Date().toISOString();

  await Profiles.createQueryBuilder()
    .update(Profiles)
    .set({ profile })
    .where("type = :type", { type: profileId })
    .execute();

  return c.json(
    MCPResponses.generate(
      profile,
      [{ changeType: "statModified", name: "current_mtx_platform", value: newPlatform }],
      profileId,
    ),
  );
}
