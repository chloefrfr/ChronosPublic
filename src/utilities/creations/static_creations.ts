import type { BattlePass, SeasonStats } from "../../tables/account";

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

export function createDefaultBattlePassProperties(): Omit<
  BattlePass,
  "purchased_battle_pass_tier_offers" | "purchased_bp_offers"
> {
  return {
    book_purchased: false,
    book_level: 1,
    book_xp: 0,
    season_friend_match_boost: 0,
    season_match_boost: 0,
    level: 1,
    battlestars_currency: 0,
    battlestars: 0,
    intro_game_played: false,
    xp: 0,
  };
}
