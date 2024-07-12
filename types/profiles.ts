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

export interface Athena {
  _id: string;
  createdAt: string;
  updatedAt: string;
  rvn: number;
  wipeNumber: number;
  accountId: string;
  profileId: "athena";
  version: "no_version";
  stats: {
    attributes: Partial<StatsAttributes>;
  };
  items: {
    [key: string]: {
      templateId: string;
      attributes: Partial<ItemValue>;
      quantity: number;
    };
  };
  commandRevision: number;
}

export interface CommonCore {
  _id: string;
  createdAt: string;
  updatedAt: string;
  rvn: number;
  wipeNumber: number;
  accountId: string;
  profileId: "common_core";
  version: "no_version";
  items: {
    [key: string]: {
      templateId: string;
      attributes: Partial<ItemValue>;
      quantity: number;
    };
  };
  stats: {
    attributes: Partial<StatsAttributes>;
  };
  commandRevision: number;
}

export interface CommonPublic {
  _id: string;
  createdAt: string;
  updatedAt: string;
  rvn: number;
  wipeNumber: number;
  accountId: string;
  profileId: "common_public";
  version: "no_version";
  items: {
    [key: string]: {
      templateId: string;
      attributes: Partial<ItemValue>;
      quantity: number;
    };
  };
  stats: {
    attributes: Partial<StatsAttributes>;
  };
  commandRevision: number;
}

export interface StatsAttributes {
  use_random_loadout: boolean;
  past_seasons: PastSeasons[];
  season_match_boost: number;
  loadouts: string[];
  mfa_reward_claimed: boolean;
  rested_xp_overflow: number;
  current_mtx_platform: string;
  last_xp_interaction: string;
  quest_manager: {
    dailyLoginInterval: string;
    dailyQuestRerolls: number;
  };
  book_level: number;
  season_num: number;
  book_xp: number;
  creative_dynamic_xp: any;
  season: {
    numWins: number;
    numHighBracket: number;
    numLowBracket: number;
  };
  party_assist_quest: string;
  pinned_quest: string;
  vote_data: {
    electionId: string;
    voteHistory: Record<string, any>;
    votesRemaining: number;
    lastVoteGranted: string;
  };
  lifetime_wins: number;
  book_purchased: boolean;
  rested_xp_exchange: number;
  level: number;
  rested_xp: number;
  rested_xp_mult: number;
  accountLevel: number;
  rested_xp_cumulative: number;
  xp: number;
  battlestars: number;
  battlestars_season_total: number;
  season_friend_match_boost: number;
  active_loadout_index: number;
  purchased_bp_offers: any[];
  purchased_battle_pass_tier_offers: any[];
  last_match_end_datetime: string;
  mtx_purchase_history_copy: any[];
  last_applied_loadout: string;
  favorite_musicpack: string;
  banner_icon: string;
  favorite_character: string;
  favorite_itemwraps: string[];
  favorite_skydivecontrail: string;
  favorite_pickaxe: string;
  favorite_glider: string;
  favorite_backpack: string;
  favorite_dance: string[];
  favorite_loadingscreen: string;
  banner_color: string;
  survey_data: any;
  personal_offers: any;
  intro_game_played: boolean;
  import_friends_claimed: any;
  mtx_purchase_history: {
    refundsUsed: number;
    refundCredits: number;
    purchases: any[];
  };
  undo_cooldowns: any[];
  mtx_affiliate_set_time: string;
  inventory_limit_bonus: number;
  mtx_affiliate: string;
  forced_intro_played: string;
  weekly_purchases: any;
  daily_purchases: any;
  ban_history: {
    banCount: number;
    banTier: any;
  };
  in_app_purchases: any;
  permissions: any[];
  undo_timeout: string;
  monthly_purchases: any;
  allowed_to_send_gifts: boolean;
  mfa_enabled: boolean;
  allowed_to_receive_gifts: boolean;
  gift_history: any;
  gifts: any[];
  ban_status: {
    bRequiresUserAck: boolean;
    bBanHasStarted: boolean;
    banReasons: any[];
    banStartTimeUtc: string | null;
    banDurationDays: number | null;
    additionalInfo: string;
    exploitProgramName: string;
    competitiveBanReason: string;
  };
}

interface Variants {
  channel: string;
  owned: string[];
}

interface Lootlist {
  itemType: string;
  itemGuid: string;
  quantity: string;
}

interface Gifts {
  templateId: string;
  attributes: {
    lootList: Lootlist[];
  };
  quntity: number;
}

export interface ItemValue {
  platform: string;
  item_seen: boolean;
  refundsUsed?: number;
  refundCredits?: number;
  level: number;
  max_level_bonus: 0;
  rnd_sel_cnt: 0;
  variants: Variants[];
  xp: 0;
  purchases?: any[];
  undo_cooldowns?: any[];
  mtx_affiliate_set_time?: string;
  inventory_limit_bonus?: number;
  mtx_affiliate?: string;
  forced_intro_played?: string;
  weekly_purchases?: any;
  daily_purchases?: any;
  ban_history?: {
    banCount: number;
    banTier: any;
  };
  in_app_purchases?: any;
  permissions?: any[];
  undo_timeout?: string;
  monthly_purchases?: any;
  allowed_to_send_gifts?: boolean;
  mfa_enabled?: boolean;
  allowed_to_receive_gifts?: boolean;
  gift_history?: any;
  gifts?: Gifts[];
  ban_status?: {
    bRequiresUserAck: boolean;
    bBanHasStarted: boolean;
    banReasons: any[];
    banStartTimeUtc: string | null;
    banDurationDays: number | null;
    additionalInfo: string;
    exploitProgramName: string;
    competitiveBanReason: string;
  };
  survey_data?: any;
  personal_offers?: any;
  intro_game_played?: boolean;
  import_friends_claimed?: any;
  mtx_purchase_history?: {
    refundsUsed: number;
    refundCredits: number;
    purchases: any[];
  };
  locker_slots_data: {
    slots: {
      [slotName: string]: {
        items: string[];
        activeVariants: any[];
      };
    };
  };
  use_count: number;
  banner_icon_template: string;
  banner_color_template: string;
  locker_name: string;
  favorite: boolean;
}
