import type { Abilities, AbilitiesCombination } from "../../../types/permissionsdefs";

export const parseAbilities = (abilities: Abilities | AbilitiesCombination) => {
  return abilities.split(",").map((ability) => ability.trim());
};
