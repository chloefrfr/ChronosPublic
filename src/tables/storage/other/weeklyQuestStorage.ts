import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { BattlepassQuestData } from "./battlepassQuestStorage";
import Config from "../../../wrappers/Env.wrapper";

const config = new Config().getConfig();

@Entity()
export class WeeklyQuest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ nullable: false, default: config.currentSeason })
  season!: number;

  @Column({ type: "jsonb" })
  data!: BattlepassQuestData[];
}
