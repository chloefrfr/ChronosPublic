import { itemStorageService, logger } from "../..";
import { ShopHelper } from "../helpers/shophelper";
import { ShopGenerator } from "../shop";
import cron from "node-cron";

export default async function rotate() {
  logger.info("Waiting for storefront generation.");

  cron.schedule(
    "0 17 * * *",
    async () => {
      await ShopGenerator.generate();
      const nextRun = new Date();
      nextRun.setHours(17, 0, 0, 0);
      nextRun.setDate(nextRun.getDate() + 1);

      logger.info(`Next shop generates at ${nextRun}`);
      logger.info("Successfully generated storefront.");

      await itemStorageService.addItems([
        {
          data: ShopHelper.getCurrentShop(),
          type: "storefront",
        },
      ]);
    },
    {
      timezone: "America/Phoenix",
    },
  );
}
