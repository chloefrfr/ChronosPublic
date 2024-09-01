import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { Permission } from "../../types/permissionsdefs";

export interface SeasonStats {
  wins: number;
  kills: number;
  matchesplayed: number;
  top25: number;
  top10: number;
  top1: number;
}

export interface Stats {
  solos: SeasonStats;
  duos: SeasonStats;
  squads: SeasonStats;
  ltm: SeasonStats;
}

export interface FortniteReceipts {
  appStore: string;
  appStoreId: string;
  receiptId: string;
  receiptInfo: string;
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
  stats!: Stats;

  @Column({ type: "jsonb", nullable: false, default: [] })
  permissions!: Permission[];

  @Column({ type: "jsonb", nullable: false, default: [] })
  receipts!: FortniteReceipts[];

  @Column({ nullable: false, default: 0 })
  arenaHype!: number;
}
