import type { JSONResponse } from "../interfaces/FortniteAPI";

export function getPrice(item: JSONResponse) {
  const rarity = item.rarity.backendValue.split("::")[1];

  switch (item.type.backendValue) {
    case "AthenaCharacter":
      // Uncommon, Rare, Epic, Legendary
      var prices: number[] = [800, 1200, 1500, 2000];

      switch (rarity) {
        case "Uncommon":
          return prices[0];

        case "Rare":
          return prices[1];

        case "Epic":
          return prices[2];

        case "Legendary":
          return prices[3];
      }
      break;

    case "AthenaPickaxe":
      // Uncommon, Rare, Epic
      prices = [500, 800, 1200];

      switch (rarity) {
        case "Uncommon":
          return prices[0];

        case "Rare":
          return prices[1];

        case "Epic":
          return prices[2];
      }
      break;

    case "AthenaGlider":
      // Uncommon, Rare, Epic, Legendary
      prices = [500, 800, 1200, 1500];

      switch (rarity) {
        case "Uncommon":
          return prices[0];

        case "Rare":
          return prices[1];

        case "Epic":
          return prices[2];

        case "Legendary":
          return prices[3];
      }
      break;

    case "AthenaItemWrap":
      // Uncommon, Rare
      prices = [300, 500];

      switch (rarity) {
        case "Uncommon":
          return prices[0];

        case "Rare":
          return prices[1];

        case "Epic":
          return prices[1];
      }
      break;

    case "AthenaDance":
      // Uncommon, Rare, Epic
      prices = [200, 500, 800];

      switch (rarity) {
        case "Uncommon":
          return prices[0];

        case "Rare":
          return prices[1];

        case "Epic":
          return prices[2];
      }
      break;
  }
}
