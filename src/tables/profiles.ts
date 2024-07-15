import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type {
  Athena,
  Campaign,
  CommonCore,
  CommonPublic,
  Metadata,
  Theater,
} from "../../types/profilesdefs";

@Entity()
export class Profiles extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  accountId!: string;

  @Column({ type: "jsonb", default: {} })
  athena!: Athena;

  @Column({ type: "jsonb", default: {} })
  common_core!: CommonCore;

  @Column({ type: "jsonb", default: {} })
  common_public!: CommonPublic;

  @Column({ type: "jsonb", default: [] })
  campaign!: Campaign;

  @Column({ type: "jsonb", default: [] })
  metadata!: Metadata;

  @Column({ type: "jsonb", default: [] })
  theater0!: Theater;
}
