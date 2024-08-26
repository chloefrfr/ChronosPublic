import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { BattlepassQuestData } from "./battlepassQuestStorage";

@Entity()
export class WeeklyQuest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ type: "jsonb" })
  data!: BattlepassQuestData[];
}
