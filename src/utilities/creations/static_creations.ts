import type { SeasonStats } from "../../tables/account";

export function createGameModeStats(): SeasonStats {
  return {
    kills: 0,
    matchesplayed: 0,
    wins: 0,
    top25: 0,
    top10: 0,
    top1: 0,
  };
}
