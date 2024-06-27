import type { Context } from "hono";
import { XmppUtilities } from "../xmpp/utilities/XmppUtilities";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/profiles";
import { accountService, userService } from "..";
import { Profiles } from "../tables/profiles";

export default async function (c: Context) {
  const { playerName, receiverPlayerName } = await c.req.json();
  const timestamp = new Date().toISOString();

  const senderUser = await userService.findUserByUsername(playerName);
  if (!senderUser)
    return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

  const senderAccountId = senderUser.accountId;
  const senderAccount = await accountService.findUserByAccountId(senderAccountId);
  if (!senderAccount)
    return c.json(errors.createError(404, c.req.url, "Failed to find account.", timestamp), 404);

  const [athenaProfile, commonCoreProfile] = await Promise.all([
    ProfileHelper.getProfile(senderAccountId, "athena"),
    ProfileHelper.getProfile(senderAccountId, "common_core"),
  ]);

  if (!athenaProfile || !commonCoreProfile)
    return c.json(errors.createError(400, c.req.url, "Profile not found.", timestamp), 404);

  const userAgent = uaparser(c.req.header("User-Agent"));
  if (!userAgent)
    return c.json(
      errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
      400,
    );

  let notifications: object[] = [];
  let applyProfileChanges: object[] = [];
  let baseRevision = commonCoreProfile.rvn;

  const receiverUser = await userService.findUserByUsername(receiverPlayerName);
  if (!receiverUser)
    return c.json(errors.createError(404, c.req.url, "Failed to find user.", timestamp), 404);

  const receiverAccountId = receiverUser.accountId;
  let receiverProfile = await accountService.findUserByAccountId(receiverAccountId);
  if (!receiverProfile)
    return c.json(errors.createError(404, c.req.url, "Failed to find account.", timestamp), 404);

  XmppUtilities.SendMessageToId(
    JSON.stringify({
      type: "com.epicgames.gift.received",
      payload: {},
      timestamp: new Date().toISOString(),
    }),
    receiverAccountId,
  );

  const profileRevision = athenaProfile.rvn;
  const profileId = userAgent.season <= 11 ? "common_core" : "athena";
  const profileChanges = applyProfileChanges
    ? await ProfileHelper.GenerateProfileChange("fullProfileUpdate", athenaProfile)
    : await ProfileHelper.GenerateProfileChange("fullProfileUpdate", commonCoreProfile);

  return c.json({
    profileRevision,
    profileId,
    profileChangesBaseRevision: athenaProfile.rvn - 1,
    profileChanges,
    notifications,
    profileCommandRevision: athenaProfile.commandRevision,
    serverTime: new Date().toISOString(),
    responseVersion: 1,
  });
}
