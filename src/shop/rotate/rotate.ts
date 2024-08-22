import { itemStorageService } from "../..";
import { ShopHelper } from "../helpers/shophelper";
import { ShopGenerator } from "../shop";

export default async function () {
  await ShopGenerator.generate();

  const shopData = ShopHelper.getCurrentShop();
  const addedItems = await itemStorageService.addItems([{ data: shopData, type: "storefront" }]);

  if (!addedItems) return false;

  return true;
}
