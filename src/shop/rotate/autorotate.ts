import { logger } from "../..";
import { ShopGenerator } from "../shop";

export default async function rotate(now: boolean) {
  if (!now) {
    const runAtMidnight = () => {
      const currentDate = new Date();
      const midnightUTC = new Date(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      );

      const delayMillis = midnightUTC.getTime() - currentDate.getTime();

      setTimeout(async () => {
        logger.info("Generating new storefront.");
        await ShopGenerator.generate();

        runAtMidnight();
      }, delayMillis);
    };

    runAtMidnight();
  } else await ShopGenerator.generate();
}
