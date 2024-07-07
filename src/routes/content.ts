import { app } from "..";
import errors from "../utilities/errors";
import uaparser from "../utilities/uaparser";
import path from "node:path";
import type { ContentPages } from "../../types/contentpages";

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

    const Pages: ContentPages = await Bun.file(
      path.join(__dirname, "..", "memory", "content", "pages.json"),
    ).json();

    Pages.dynamicbackgrounds.backgrounds.backgrounds[0].stage = `season${uahelper.season}`;
    Pages.dynamicbackgrounds.backgrounds.backgrounds[0].key = "lobby";

    Pages.dynamicbackgrounds.backgrounds.backgrounds[1].stage = `season${uahelper.season}`;
    Pages.dynamicbackgrounds.backgrounds.backgrounds[1].key = "vault";

    return c.json(Pages);
  });
}
