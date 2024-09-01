import { accountService, app, config, profilesService, userService } from "..";
import { Validation } from "../middleware/validation";
import { Profiles } from "../tables/profiles";
import errors from "../utilities/errors";
import { LevelsManager } from "../utilities/managers/LevelsManager";
import { RewardsManager } from "../utilities/managers/RewardsManager";
import ProfileHelper from "../utilities/profiles";
import { v4 as uuid } from "uuid";
import MCPResponses from "../utilities/responses";
import { BattlepassManager } from "../utilities/managers/BattlepassManager";
import { servers } from "../sockets/matchmaker/server";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";
import { handleProfileSelection } from "../operations/QueryProfile";
import RefreshAccount from "../utilities/refresh";

export default function () {
  app.post("/gamesessions/setStatus", Validation.verifyBasicToken, async (c) => {
    let body;
    const timestamp = new Date().toISOString();

    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON", timestamp), 400);
    }

    const { status, sessionId } = body;

    try {
      const existingServers = servers.find((s) => s.sessionId === sessionId);

      if (!existingServers)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Failed to set server status to '${status}'`,
            timestamp,
          ),
          400,
        );

      existingServers.status = status;

      return c.json({ message: `Successfully set server status to '${status}'` });
    } catch (error) {
      return c.json(
        errors.createError(500, c.req.url, "Failed to set server status.", timestamp),
        500,
      );
    }
  });

  app.post(
    "/gamesessions/stats/vbucks/:username/:sessionId/:eliminations",
    Validation.verifyBasicToken,
    async (c) => {
      const username = c.req.param("username");
      const timestamp = new Date().toISOString();

      const [user] = await Promise.all([userService.findUserByUsername(username)]);

      if (!user)
        return c.json(errors.createError(404, c.req.url, "User not found!", timestamp), 404);

      const [common_core, athena] = await Promise.all([
        handleProfileSelection("common_core", user.accountId),
        handleProfileSelection("athena", user.accountId),
      ]);

      if (!common_core)
        return c.json(
          errors.createError(404, c.req.url, "Profile 'common_core' was not found!", timestamp),
          404,
        );

      if (!athena)
        return c.json(
          errors.createError(404, c.req.url, "Profile 'athena' was not found!", timestamp),
          404,
        );

      let body;

      try {
        body = await c.req.json();
      } catch (error) {
        return c.json(errors.createError(400, c.req.url, "Body isn't Valid JSON!", timestamp), 400);
      }

      const { isVictory } = await c.req.json();
      const changes: object[] = [];

      try {
        const eliminations = parseInt(c.req.param("eliminations"));

        for (const pastSeasons of athena.stats.attributes!.past_seasons!) {
          if (pastSeasons.seasonNumber === config.currentSeason) {
            let currency = eliminations * 50;
            if (isVictory) {
              currency += 200;
              pastSeasons.numWins += 1;
            }

            common_core.items["Currency:MtxPurchased"].quantity += currency;

            changes.push({
              amountGained: currency,
            });
          }
        }

        await profilesService.update(user.accountId, "common_core", common_core);
        await profilesService.update(user.accountId, "athena", athena);

        await RefreshAccount(user.accountId, user.username);

        return c.json(MCPResponses.generate(common_core, changes, "common_core"));
      } catch (error) {
        return c.json({ error: `Internal Server Error: ${error}` }, 500);
      }
    },
  );

  app.post(
    "/gamesessions/levels/:username/:sessionId/:totalXp",
    Validation.verifyBasicToken,
    async (c) => {
      const username = c.req.param("username");
      const timestamp = new Date().toISOString();

      try {
        const user = await userService.findUserByUsername(username);
        if (!user) {
          return c.json(errors.createError(404, c.req.url, "User not found!", timestamp), 404);
        }

        const athena = await handleProfileSelection("athena", user.accountId);
        if (!athena) {
          return c.json(
            errors.createError(404, c.req.url, "Profile 'athena' was not found!", timestamp),
            404,
          );
        }

        const common_core = await handleProfileSelection("common_core", user.accountId);
        if (!common_core) {
          return c.json(
            errors.createError(404, c.req.url, "Profile 'common_core' was not found!", timestamp),
            404,
          );
        }

        const totalXp = parseInt(c.req.param("totalXp"));
        const { attributes } = athena.stats;
        const changes: object[] = [];

        for (const pastSeason of attributes.past_seasons!) {
          if (pastSeason.seasonNumber === config.currentSeason) {
            pastSeason.seasonXp += totalXp;

            if (isNaN(attributes.level!)) attributes.level = 1;
            if (isNaN(attributes.xp!)) attributes.xp = 0;

            const updater = await RewardsManager.addGrant(pastSeason);
            const lootList: { itemType: string; itemGuid: string; quantity: number }[] = [];

            if (!updater) continue;

            // so unproper but idc, it works
            updater.items.forEach(async (val) => {
              switch (val.type) {
                case "athena":
                  if (val.templateId.toLowerCase().includes("cosmeticvarianttoken:")) {
                    const tokens = await BattlepassManager.GetCosmeticVariantTokenReward();

                    const vtidMapping: { [key: string]: string } = {
                      vtid_655_razerzero_styleb: "VTID_655_RazerZero_StyleB",
                      vtid_656_razerzero_stylec: "VTID_656_RazerZero_StyleC",
                      vtid_949_temple_styleb: "VTID_949_Temple_StyleB",
                      vtid_934_progressivejonesy_backbling_styleb:
                        "VTID_934_ProgressiveJonesy_Backbling_StyleB",
                      vtid_940_dinohunter_styleb: "VTID_940_DinoHunter_StyleB",
                      vtid_937_progressivejonesy_backbling_stylee:
                        "VTID_937_ProgressiveJonesy_Backbling_StyleE",
                      vtid_935_progressivejonesy_backbling_stylec:
                        "VTID_935_ProgressiveJonesy_Backbling_StyleC",
                      vtid_933_chickenwarrior_backbling_stylec:
                        "VTID_933_ChickenWarrior_Backbling_StyleC",
                      vtid_943_chickenwarrior_stylec: "VTID_943_ChickenWarrior_StyleC",
                      vtid_956_chickenwarriorglider_stylec: "VTID_956_ChickenWarriorGlider_StyleC",
                      vtid_936_progressivejonesy_backbling_styled:
                        "VTID_936_ProgressiveJonesy_Backbling_StyleD",
                      vtid_938_obsidian_styleb: "VTID_938_Obsidian_StyleB",
                    };

                    const reward =
                      tokens[vtidMapping[val.templateId.replace("CosmeticVariantToken:", "")]];
                    if (!reward) return;

                    let parts = reward.templateId.split(":");
                    parts[1] = parts[1].toLowerCase();

                    let templateId = parts.join(":");

                    const Item = athena.items[templateId];
                    if (!Item) return;

                    const newVariant = athena.items[templateId]?.attributes?.variants ?? [];

                    const existingVariant = newVariant.find(
                      (variant) => variant.channel === reward.channel,
                    );

                    if (existingVariant) {
                      existingVariant.owned.push(reward.value);
                    } else {
                      newVariant.push({
                        channel: reward.channel,
                        active: reward.value,
                        owned: [reward.value],
                      });
                    }
                  }

                  athena.items[val.templateId] = {
                    templateId: val.templateId,
                    // @ts-ignore
                    attributes: val.attributes,
                    quantity: val.quantity,
                  };
                  break;
                case "common_core":
                  if (val.templateId.includes("Currency")) {
                    let found = false;
                    for (const itemId in common_core.items) {
                      if (common_core.items[itemId].templateId === val.templateId) {
                        common_core.items[itemId].quantity += val.quantity;
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      common_core.items[val.templateId] = {
                        templateId: val.templateId,
                        // @ts-ignore
                        attributes: val.attributes,
                        quantity: val.quantity,
                      };
                    }
                  } else {
                    common_core.items[val.templateId] = {
                      templateId: val.templateId,
                      // @ts-ignore
                      attributes: val.attributes,
                      quantity: val.quantity,
                    };
                  }
                  break;

                case "athenaseasonxpboost":
                  attributes.season_match_boost =
                    (attributes.season_match_boost || 0) + val.quantity;
                  break;
                case "athenaseasonfriendxpboost":
                  attributes.season_friend_match_boost =
                    (attributes.season_friend_match_boost || 0) + val.quantity;
                  break;
              }

              lootList.push({
                itemType: val.templateId,
                itemGuid: val.templateId,
                quantity: val.quantity,
              });
            });

            if (updater.canGrantItems) {
              common_core.stats.attributes.gifts!.push({
                templateId: "GiftBox:gb_battlepass",
                attributes: {
                  lootList,
                },
                quantity: 1,
              });
            }

            attributes.level = updater.pastSeasons.seasonLevel;
            attributes.book_level = updater.pastSeasons.bookLevel;
            attributes.xp! += updater.pastSeasons.seasonXp;
            attributes.accountLevel! += 1;

            attributes.last_xp_interaction = new Date().toISOString();

            changes.push({
              level: attributes.level,
              book_level: attributes.book_level,
              xp: attributes.xp,
              last_xp_interaction: attributes.last_xp_interaction,
            });

            await RefreshAccount(user.accountId, user.username);
          }
        }

        await profilesService.update(user.accountId, "athena", athena);
        await profilesService.update(user.accountId, "common_core", common_core);

        await RefreshAccount(user.accountId, user.username);

        return c.json(MCPResponses.generate(athena, changes, "athena"));
      } catch (error) {
        return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
      }
    },
  );
}
