import { app, itemStorageService, userService } from "..";
import axios from "axios";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import { ShopGenerator } from "../shop/shop";
import { ShopHelper } from "../shop/helpers/shophelper";

export default function () {
  app.get("/fortnite/api/storefront/v2/keychain", async (c) => {
    const keychainResponse = await axios.get("https://api.nitestats.com/v1/epic/keychain");
    return c.json(keychainResponse.data);
  });

  app.get("/fortnite/api/storefront/v2/catalog", async (c) => {
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

    if (uahelper.season === 0) return c.json({});

    const storefrontData = await itemStorageService.getItemByType("storefront");

    if (!storefrontData)
      return c.json(
        errors.createError(400, c.req.url, "Failed to get current storefront.", timestamp),
        400,
      );

    return c.json(storefrontData.data);
  });
}
