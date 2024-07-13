import { itemStorageService } from "../..";
import { ShopHelper } from "../helpers/shophelper";
import { ShopGenerator } from "../shop";

export default async function () {
  await ShopGenerator.generate();

  const addedItems = await itemStorageService.addItem(
    [
      {
        templateId: "ChronosShop",
        data: ShopHelper.getCurrentShop(),
      },
    ],
    "storefront",
  );

  return true;
}
