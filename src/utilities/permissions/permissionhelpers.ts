import type { Abilities, AbilitiesCombination } from "../../../types/permissionsdefs";

export const parseAbilities = (abilities: Abilities | AbilitiesCombination): Abilities[] => {
  return abilities.split(",") as Abilities[];
};
