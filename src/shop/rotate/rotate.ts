import { itemStorageService } from "../..";
import { ShopHelper } from "../helpers/shophelper";
import { ShopGenerator } from "../shop";

export default async function () {
  await ShopGenerator.generate();

  const addedItems = await itemStorageService.addItem(ShopHelper.getCurrentShop(), "storefront");

  if (!addedItems) return false;

  return true;
}
