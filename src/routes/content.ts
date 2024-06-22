import axios from "axios";
import { app, logger } from "..";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";

interface Background {
  stage: string;
  _type: string;
  key: string;
}

export default function () {
  app.get("/content/api/pages/fortnite-game", async (c) => {
    const useragent = c.req.header("User-Agent");
    const timestamp = new Date().toISOString();

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

    const request = await fetch(
      "https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game",
    ).then((res) => res.json() as any);

    /// TODO - VaultBackgrounds (ShopBackgrounds) & Emergencynotices & Battleroyalenews

    request.dynamicbackgrounds = {
      "jcr:isCheckedOut": true,
      backgrounds: {
        backgrounds: [
          {
            stage: uahelper.season === 10 ? uahelper.SeasonX : `season${uahelper.season}`,
            _type: "DynamicBackground",
            key: "lobby",
          },
          {
            stage: uahelper.season === 10 ? uahelper.SeasonX : `season${uahelper.season}`,
            _type: "DynamicBackground",
            key: "vault",
          },
        ],
        _type: "DynamicBackgroundList",
      },
      _title: "dynamicbackgrounds",
      _noIndex: false,
      "jcr:baseVersion": "a7ca237317f1e71f17852c-bccd-4be6-89a0-1bb52672a444",
      _activeDate: new Date(),
      lastModified: new Date(),
      _locale: "en-US",
    };
    request.subgameinfo.battleroyale = {};

    return c.json(request);
  });
}
