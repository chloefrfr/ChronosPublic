import { accountService, app, hypeService, userService } from "..";
import { Validation } from "../middleware/validation";
import errors from "../utilities/errors";
import path from "node:path";
import uaparser from "../utilities/uaparser";

interface ArenaTemplate {
  eventTemplateId: string;
}

interface EventWindow {
  eventTemplateId: string;
  eventWindowId: string;
  requireAllTokens: string[];
  requireNoneTokensCaller: string[];
}

interface Event {
  eventId: string;
  eventWindows: EventWindow[];
}

export default function () {
  app.get("/api/v1/events/Fortnite/download/:accountId", async (c) => {
    const accountId = c.req.param("accountId");
    const timestamp = new Date().toISOString();
    const useragent = c.req.header("User-Agent");

    if (!accountId)
      return c.json(
        errors.createError(400, c.req.url, "Parameter 'accountId' is missing", timestamp),
        400,
      );

    const uahelper = uaparser(useragent);

    if (!useragent)
      return c.json(
        errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
        400,
      );

    if (!uahelper)
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );

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

    const events: Event[] = await Bun.file(
      path.join(__dirname, "..", "memory", "events", "events.json"),
    ).json();

    const arenaTemplates: ArenaTemplate[] = await Bun.file(
      path.join(__dirname, "..", "memory", "events", "templates", "ArenaTemplate.json"),
    ).json();

    events.forEach((event) => {
      event.eventId = event.eventId.replace(/S13/g, `S${uahelper.season}`);
      event.eventWindows.forEach((window) => {
        window.eventTemplateId = window.eventTemplateId.replace(/S13/g, `S${uahelper.season}`);
        window.eventWindowId = window.eventWindowId.replace(/S13/g, `S${uahelper.season}`);
        window.requireAllTokens = window.requireAllTokens.map((token) =>
          token.replace(/S13/g, `S${uahelper.season}`),
        );
        window.requireNoneTokensCaller = window.requireNoneTokensCaller.map((token) =>
          token.replace(/S13/g, `S${uahelper.season}`),
        );
      });
    });

    arenaTemplates.forEach((template) => {
      template.eventTemplateId = template.eventTemplateId.replace(/S13/g, `S${uahelper.season}`);
    });

    const entries: string[] = [];

    for (let division = 1; division <= 10; division++) {
      entries.push(
        `epicgames_Arena_S${uahelper.season}_Solo:Arena_S${uahelper.season}_Division${division}_Solo`,
      );
    }

    // entries.unshift(`epicgames_Arena_S${uahelper.season}_Solo:Arena_S${uahelper.season}_Solo`);

    const teams = entries.reduce((acc, entry) => {
      // @ts-ignore
      acc[entry] = [user.accountId];
      return acc;
    }, {});

    await hypeService.create(uahelper.season);

    const hype = await hypeService.getAll();

    const hypeTokens: string[] = [];

    hype.forEach((token) => {
      if (
        account.arenaHype >= token.minimum_required_hype &&
        account.arenaHype <= parseInt(token.maximum_required_hype)
      ) {
        hypeTokens.push(token.name);
      }
    });

    return c.json({
      events,
      player: {
        accountId: user.accountId,
        gameId: "Fortnite",
        groupIdentity: {},
        pendingPayouts: [],
        pendingPenalties: {},
        persistentScores: {
          Hype: account.arenaHype,
        },
        teams,
        tokens: hypeTokens,
      },
      templates: arenaTemplates,
    });
  });
}
