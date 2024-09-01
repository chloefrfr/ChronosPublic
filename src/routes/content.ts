import { app } from "..";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import path from "node:path";
import type { ContentPages } from "../../types/contentpages";

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

    const Pages: ContentPages = await Bun.file(
      path.join(__dirname, "..", "memory", "content", "pages.json"),
    ).json();

    Pages.dynamicbackgrounds.backgrounds.backgrounds.push(
      {
        stage: uahelper.background,
        _type: "DynamicBackground",
        key: "vault",
      },
      {
        stage: uahelper.background,
        _type: "DynamicBackground",
        key: "lobby",
      },
    );

    if (uahelper.season >= 19) {
      Pages.dynamicbackgrounds.backgrounds.backgrounds.push({
        stage: "defaultnotris",
        _type: "DynamicBackground",
        key: "lobby",
        backgroundimage:
          "https://cdn2.unrealengine.com/nocturnal-storebg-cms-1921x1081-796115fa0fc9.png",
      });
    }

    return c.json(Pages);
  });
}
