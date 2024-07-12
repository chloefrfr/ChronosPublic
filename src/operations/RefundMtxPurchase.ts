import type { Context } from "hono";
import ProfileHelper from "../utilities/profiles";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import type { ProfileId } from "../utilities/responses";
import { accountService, profilesService, userService } from "..";
import MCPResponses from "../utilities/responses";
import { Profiles } from "../tables/profiles";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();
  const useragent = c.req.header("User-Agent");

  if (!useragent)
    return c.json(
      errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
      400,
    );

  const uahelper = uaparser(useragent);

  if (!uahelper)
    return c.json(
      errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
      400,
    );

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

  const profile = await ProfileHelper.getProfile(user.accountId, "common_core");

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

  const { purchaseId } = body;

  let applyProfileChanges: object[] = [];
  const notifications: object[] = [];
  const multiUpdates: object[] = [];

  const athena = await ProfileHelper.getProfile(user.accountId, "athena");

  if (!athena)
    return c.json(
      errors.createError(404, c.req.url, `Profile athena was not found.`, timestamp),
      404,
    );

  const { mtx_purchase_history } = profile.stats.attributes;

  mtx_purchase_history!.refundsUsed += 1;
  mtx_purchase_history!.refundCredits -= 1;

  const items: string[] = [];
  const specificPurchase = mtx_purchase_history!.purchases.find(
    (purchase: any) => purchase.purchaseId === purchaseId,
  );

  if (specificPurchase) {
    for (const lootResult of specificPurchase.lootResult) {
      items.push(lootResult.itemGuid);
    }

    specificPurchase.refundDate = new Date().toISOString();

    for (const key in profile.items) {
      const item = profile.items[key];
      const { templateId } = item;

      if (!templateId.startsWith("Currency:Mtx")) continue;

      item.quantity += specificPurchase.totalMtxPaid;
      applyProfileChanges.push({
        changeType: "itemQuantityChanged",
        itemId: key,
        quantity: item.quantity,
      });
    }
  }

  for (const item in items) {
    delete athena.items[items[item]];

    multiUpdates.push({
      changeType: "itemRemoved",
      itemId: items[item],
    });
  }

  applyProfileChanges.push({
    changeType: "statModified",
    name: "mtx_purchase_history",
    value: mtx_purchase_history,
  });

  if (applyProfileChanges.length > 0) {
    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();
  }

  if (multiUpdates.length > 0) {
    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updatedAt = new Date().toISOString();
  }

  await profilesService.update(user.accountId, "common_core", profile);
  await profilesService.update(user.accountId, "athena", athena);

  return c.json(
    MCPResponses.generateRefundResponse(
      profile,
      athena,
      applyProfileChanges,
      multiUpdates,
      profileId,
    ),
  );
}
