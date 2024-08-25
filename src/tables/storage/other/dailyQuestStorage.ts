import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface DailyQuestData {
  [key: string]: {
    templateId: string;
    attributes: Attributes;
    quantity: number;
  };
}

export interface Attributes {
  sent_new_notification: boolean;
  ObjectiveState: ObjectiveState[];
  creation_time: string;
  level: number;
  item_seen: boolean;
  playlists: string[];
  challenge_bundle_id: string;
  xp_reward_scalar: number;
  challenge_linked_quest_given: string;
  quest_pool: string;
  quest_state: string;
  bucket: string;
  last_state_change_time: string;
  challenge_linked_quest_parent: string;
  max_level_bonus: number;
  xp: number;
  quest_rarity: string;
  favorite: boolean;
  [key: string]: any;
}

export interface ObjectiveState {
  Name: string;
  Value: number;
}

@Entity()
export class DailyQuest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ type: "jsonb" })
  data!: DailyQuestData[];
}
