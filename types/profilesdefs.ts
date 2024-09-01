import type { Objectives } from "../src/utilities/managers/QuestManager";

export type FavoriteSlotName =
  | "favorite_dance"
  | "favorite_itemwraps"
  | "favorite_musicpack"
  | "favorite_character"
  | "favorite_skydivecontrail"
  | "favorite_pickaxe"
  | "favorite_glider"
  | "favorite_backpack"
  | "favorite_loadingscreen";

export enum ProfileType {
  Athena = "athena",
  CommonCore = "common_core",
  CommonPublic = "common_public",
  Campaign = "campaign",
  Metadata = "metadata",
  Theater0 = "theater0",
  Outpost0 = "outpost0",
  CollectionBookSchematics0 = "collection_book_schematics0",
  CollectionBookPeople0 = "collection_book_people0",
  Collections = "collections",
  Creative = "creative",
}

export interface FavoritePropAttributes {
  [key: string]: any;
  favorite_dance?: string[];
  favorite_itemwraps?: string[];
  favorite_musicpack?: string;
  favorite_character?: string;
  favorite_skydivecontrail?: string;
  favorite_pickaxe?: string;
  favorite_glider?: string;
  favorite_backpack?: string;
  favorite_loadingscreen?: string;
}

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

export interface IProfile {
  _id: string;
  createdAt: string;
  updatedAt: string;
  rvn: number;
  wipeNumber: number;
  accountId: string;
  profileId: string;
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

export interface StatsAttributes {
  current_season: number;
  last_used_project: string;
  max_island_plots: number;
  publish_allowed: boolean;
  support_code: string;
  last_used_plot: string;
  creator_name: string;
  use_random_loadout: boolean;
  fromAccountId: string;
  past_seasons: PastSeasons[];
  season_match_boost: number;
  theater_unique_id?: string;
  past_lifetime_zones_completed?: number;
  last_event_instance_key?: string;
  last_zones_completed?: Number;
  loadouts: string[];
  mfa_reward_claimed: boolean;
  rested_xp_overflow: number;
  current_mtx_platform: string;
  last_xp_interaction: string;
  node_costs: {
    homebase_node_default_page: {
      [key: string]: number;
    };
    research_node_default_page: {
      [key: string]: number;
    };
  };
  mission_alert_redemption_record: {
    claimData: {
      missionAlertId: string;
      evictClaimDataAfterUtc: string;
      redemptionDateUtc: string;
    }[];
  };
  player_loadout?: {
    primaryQuickBarRecord: {
      slots: {
        items: any[];
      }[];
    };
    secondaryQuickBarRecord: {
      slots: {
        items: any[];
      }[];
    };
    zonesCompleted: number;
    bPlayerIsNew: boolean;
  };
  research_levels: {
    offense: number;
    technology: number;
    fortitude: number;
    resistance: number;
  };
  client_settings: {
    pinnedQuestInstances: any[];
  };
  selected_hero_loadout: string;
  latent_xp_marker: string;
  collection_book: {
    maxBookXpLevelAchieved: number;
  };
  quest_manager: {
    dailyLoginInterval: string;
    dailyQuestRerolls: number;
    questPoolStats: {
      dailyLoginInterval: string;
      poolLockouts: {
        poolLockouts: {
          lockoutName: string;
        }[];
      };
      poolStats: {
        questHistory: string[];
        rerollsRemaining: number;
        nextRefresh: string;
        poolName: string;
      }[];
    };
  };
  gameplay_stats: {
    statValue: number;
    statName: string;
  }[];
  event_currency: {
    templateId: string;
    cf: number;
  };
  matches_played: number;
  daily_rewards: {
    nextDefaultReward: number;
    totalDaysLoggedIn: number;
    lastClaimDate: string;
    additionalSchedules: {
      [key: string]: {
        rewardsClaimed: number;
        claimedToday: boolean;
      };
    };
  };
  quest_completion_session_ids: {
    [key: string]: string;
  };
  packs_granted: number;
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
  gifts: Gifts[];
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

export interface Variants {
  channel: string;
  active: string;
  owned: string[];
}

export interface Lootlist {
  itemType: string;
  itemGuid: string;
  itemProfile: string;
  quantity: number;
}

interface Gifts {
  templateId: string;
  attributes: {
    lootList: Lootlist[];
  };
  quantity: number;
}

interface SavedRecords {
  recordIndex: number;
  archiveNumber: number;
  recordFilename: string;
}

interface PlacedBuildings {
  buildingTag: string;
  placedTag: string;
}

interface ProgressionInfo {
  progressionLayoutGuid: string;
  highestDefeatedTier: number;
}

interface GiftParameters {
  userMessage: string;
}

interface ObjectiveState {
  Name?: string;
  Value?: number;
  BackendName?: string;
  Count?: number;
  Stage?: number;
}

export interface ItemValue {
  platform: string;
  gender?: string;
  personality?: string;
  fromAccountId?: string;
  time?: string;
  squad_slot_idx?: number;
  userMessage?: string;
  templateIdHashed?: string;
  portrait?: string;
  building_slot_used?: number;
  set_bonus?: string;
  sent_new_notification: boolean;
  ObjectiveState: ObjectiveState[];
  lootList?: any[];
  alterationDefinitions?: any[];
  baseClipSize?: number;
  item_seen: boolean;
  refundsUsed?: number;
  refundCredits?: number;
  params: GiftParameters;
  sectionStates?: any[];
  state?: string;
  cloud_save_info?: {
    saveCount: number;
    savedRecords: SavedRecords[];
  };
  outpost_core_info?: {
    placedBuildings: PlacedBuildings[];
    accountsWithEditPermission: any[];
    highestEnduranceWaveReached: string;
  };
  tier_progression?: {
    progressionInfo: ProgressionInfo[];
  };
  level: number;
  max_level_bonus: number;
  rnd_sel_cnt: number;
  legacy_alterations?: any[];
  refund_legacy_item?: boolean;
  alterations?: any[];
  refundable?: boolean;
  alteration_base_rarities?: any[];
  homebaseBannerColorId?: string;
  loadedAmmo?: number;
  durability?: number;
  inventory_overflow_date?: boolean;
  itemSource?: string;
  quest_complete_playsolo?: number;
  quest_unlock_researchgadgets?: number;
  current_mtx_currency?: number;
  squad_slots_unlocked?: number;
  quest_unlock_buildweapons?: number;
  current_fort_profile_banner?: string;
  quest_unlock_defenders?: number;
  commander_level?: number;
  time_played?: number;
  squad_slot_count?: number;
  quest_unlock_eventquest?: number;
  quest_unlock_missiondefender?: number;
  homebaseBannerIconId?: string;
  squad_slot_count_1?: number;
  accountLevel: number;
  squad_slot_count_2?: number;
  daily_rewards_claimed?: number;
  seasonal_gold?: number;
  quest_unlock_craftweapons?: number;
  quest_unlock_personalassistant?: number;
  quest_unlock_upgradeweapon?: number;
  book_level: number;
  book_xp: number;
  book_sections_completed?: number;
  book_section_idx?: number;

  xp_overflow: number;
  quest_unlock_missionevent: number;
  purchased_slots: number;
  squad_slot_count_3: number;
  squad_slot_count_4: number;
  homebaseBannerColorIdBattleRoyal: string;
  currentSeason: number;
  homebaseName: string;
  variants: Variants[];
  xp: number;
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
  unlock_epoch?: string;
  granted_bundles?: string[];
  has_unlock_by_completion?: boolean;
  num_quests_completed?: number;
  max_allowed_bundle_level?: number;
  num_granted_bundle_quests?: number;
  challenge_bundle_schedule_id?: string;
  num_progress_quests_completed?: number;
  grantedquestinstanceids?: string[];
  allowed_to_receive_gifts?: boolean;
  gift_history?: any;
  gifts?: Gifts[];
  banner_color?: string;
  homebase_name?: string;
  banner_icon?: string;
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
