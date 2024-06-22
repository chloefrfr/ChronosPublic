import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

interface SeasonStats {
  wins: number;
  kills: number;
  matchplayed: number;
}

export interface Stats {
  solos: SeasonStats;
  duos: SeasonStats;
  squads: SeasonStats;
  ltm: SeasonStats;
}

export interface BattlePass {
  book_purchased: boolean;
  book_level: number;
  book_xp: number;
  season_friend_match_boost: number;
  season_match_boost: number;
  level: number;
  battlestars_currency: number;
  battlestars: number;
  intro_game_played: boolean;
  purchased_battle_pass_tier_offers: any[];
  purchased_bp_offers: any[];
  xp: number;
}

@Entity()
export class Account extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  discordId!: string;

  @Column({ type: "json", nullable: false, default: {} })
  battlepass!: BattlePass;

  @Column({ type: "json", nullable: false, default: {} })
  stats!: Stats;
}
