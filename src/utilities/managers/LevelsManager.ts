import { logger } from "../..";
import { BattlepassManager } from "./BattlepassManager";

interface PastSeasons {
  seasonNumber: number;
  numWins: number;
  numHighBracket: number;
  numLowBracket: number;
  seasonXp: number;
  seasonLevel: number;
  bookXp: number;
  bookLevel: number;
  purchasedVIP: boolean;
  numRoyalRoyales: number;
  survivorTier: number;
  survivorPrestige: number;
}

export namespace LevelsManager {
  export async function update(pastSeasons: PastSeasons) {
    const SeasonXP = await BattlepassManager.GetSeasonXP();

    for (const item of SeasonXP) {
      if (item.Level === pastSeasons.seasonLevel) {
        if (
          pastSeasons.seasonXp > item.XpToNextLevel ||
          pastSeasons.seasonXp === item.XpToNextLevel
        ) {
          pastSeasons.seasonXp -= item.XpToNextLevel;

          if (pastSeasons.seasonXp < 0) pastSeasons.seasonXp = 0;

          pastSeasons.seasonLevel += 1;
        }
      }

      if (pastSeasons.seasonXp < item.XpToNextLevel) break;
    }

    return pastSeasons;
  }
}
