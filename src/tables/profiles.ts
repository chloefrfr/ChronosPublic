import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { IProfile } from "../../types/profilesdefs";

@Entity()
export class Profiles extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  accountId!: string;

  @Column({ type: "jsonb", default: {} })
  athena!: IProfile;

  @Column({ type: "jsonb", default: {} })
  common_core!: IProfile;

  @Column({ type: "jsonb", default: {} })
  common_public!: IProfile;

  @Column({ type: "jsonb", default: {} })
  campaign!: IProfile;

  @Column({ type: "jsonb", default: {} })
  metadata!: IProfile;

  @Column({ type: "jsonb", default: {} })
  theater0!: IProfile;

  @Column({ type: "jsonb", default: {} })
  collection_book_people0!: IProfile;

  @Column({ type: "jsonb", default: {} })
  collection_book_schematics0!: IProfile;

  @Column({ type: "jsonb", default: {} })
  outpost0!: IProfile;

  @Column({ type: "jsonb", default: {} })
  creative!: IProfile;

  @Column({ type: "jsonb", default: {} })
  collections!: IProfile;
}
