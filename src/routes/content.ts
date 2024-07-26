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

    Pages.dynamicbackgrounds.backgrounds.backgrounds[0].stage = "summer";
    Pages.dynamicbackgrounds.backgrounds.backgrounds[0].key = "lobby";

    Pages.dynamicbackgrounds.backgrounds.backgrounds[1].stage = "summer";
    Pages.dynamicbackgrounds.backgrounds.backgrounds[1].key = "vault";

    Pages.playlistinformation.playlist_info.playlists[0].image =
      "https://media.discordapp.net/attachments/1266142681638113290/1266150129140895886/fwertgfwertfwer.png?ex=66a419b2&is=66a2c832&hm=23e654d18379cbaecbe7bcc66ee236b46f4a99f7ff93ec5a890d639834e3ddce&=&format=webp&quality=lossless&width=502&height=282";
    Pages.playlistinformation.playlist_info.playlists[1].image =
      "https://media.discordapp.net/attachments/1266142681638113290/1266150465205305356/ertgfbg.png?ex=66a41a02&is=66a2c882&hm=95bd086a3db903480c6f400e83872f44d5e314f25b0c1a1179d1eceaa770e4ae&=&format=webp&quality=lossless&width=805&height=452";
    Pages.playlistinformation.playlist_info.playlists[3].image =
      "https://media.discordapp.net/attachments/1266142681638113290/1266156666940817428/neiga2.png?ex=66a41fc9&is=66a2ce49&hm=7bae3e97e901359698b4d7cba4bdaa77d9c0b658ade4f53d500027e7460e14e5&=&format=webp&quality=lossless&width=805&height=452";
    Pages.playlistinformation.playlist_info.playlists[4].image =
      "https://media.discordapp.net/attachments/1266142681638113290/1266156449583599755/neiga.png?ex=66a41f95&is=66a2ce15&hm=122672a7b73447f8ece04c261ad7733e194b0ec460f5ffb91cc9674e627d5197&=&format=webp&quality=lossless&width=502&height=282";

    Pages.battleroyalenews.news.messages[0].image =
      "https://media.discordapp.net/attachments/1266142681638113290/1266156666940817428/neiga2.png?ex=66a41fc9&is=66a2ce49&hm=7bae3e97e901359698b4d7cba4bdaa77d9c0b658ade4f53d500027e7460e14e5&=&format=webp&quality=lossless&width=805&height=452";
    Pages.battleroyalenews.news.motds[0].image =
      "https://media.discordapp.net/attachments/1266142681638113290/1266156449583599755/neiga.png?ex=66a41f95&is=66a2ce15&hm=122672a7b73447f8ece04c261ad7733e194b0ec460f5ffb91cc9674e627d5197&=&format=webp&quality=lossless&width=502&height=282";

    return c.json(Pages);
  });
}
