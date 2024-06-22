import { logger } from "../..";
import { ShopGenerator } from "../shop";
import cron from "node-cron";

export default async function rotate(now: boolean) {
  if (!now) {
    logger.info("Waiting for storefront generation.");

    cron.schedule("0 0 * * *", async () => {
      await ShopGenerator.generate();
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      now.setUTCDate(now.getUTCDate() + 1);

      logger.info(`Next shop generates at ${now}`);
    });
  } else await ShopGenerator.generate();
}
