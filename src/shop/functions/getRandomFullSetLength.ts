import type { Entries } from "../interfaces/Declarations";

type CategoryEntriesMap = Map<string, Entries[]>;

export default function getRandomFullSetLength(entries: Entries[]): number {
  const uniqueCategories = new Set<string>();

  const offer: CategoryEntriesMap = entries.reduce((map, groups) => {
    if (!groups.categories || groups.categories.length === 0) return map;

    const category = groups.categories[0];

    uniqueCategories.add(category);

    if (!map.has(category)) map.set(category, []);

    map.get(category)!.push(groups);

    return map;
  }, new Map<string, Entries[]>());

  return uniqueCategories.size;
}
