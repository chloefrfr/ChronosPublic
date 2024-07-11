import { logger } from "../..";
import { BattlepassManager } from "./BattlepassManager";

export interface PastSeasons {
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
    try {
      const SeasonXP = await BattlepassManager.GetSeasonXP();

      let canGrantItems = false;
      let remainingSeasonXp = pastSeasons.seasonXp;

      for (const item of SeasonXP) {
        if (item.Level === pastSeasons.seasonLevel) {
          if (remainingSeasonXp >= item.XpToNextLevel) {
            remainingSeasonXp -= item.XpToNextLevel;

            if (isNaN(remainingSeasonXp) || remainingSeasonXp < 0) remainingSeasonXp = 0;

            pastSeasons.seasonLevel += 1;

            if (pastSeasons.seasonNumber > 10 && pastSeasons.seasonNumber < 17) {
              canGrantItems = true;
              pastSeasons.bookLevel = pastSeasons.seasonLevel;
            }
          }
        }
        if (remainingSeasonXp < item.XpToNextLevel) break;
      }

      if (pastSeasons.bookLevel > 100) pastSeasons.bookLevel = 100;

      return {
        pastSeasons,
        canGrantItems,
      };
    } catch (error) {
      logger.error(`Failed to update: ${error}`);
    }
  }
}
