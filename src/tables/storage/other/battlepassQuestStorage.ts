import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { Objectives } from "../../../utilities/managers/QuestManager";
import Config from "../../../wrappers/Env.wrapper";

export interface BattlepassQuestData {
  [key: string]: {
    templateId: string;
    attributes: Attributes;
    quantity: number;
  };
}

const config = new Config().getConfig();

interface Attributes {
  sent_new_notification: boolean;
  challenge_bundle_id: string;
  ObjectiveState: Objectives[];
  creation_time?: string;
  level?: number;
  unlock_epoch?: string;
  grantedquestinstanceids?: string[];
  max_allowed_bundle_level?: number;
  has_unlock_by_completion?: boolean;
  num_granted_bundle_quests?: number;
  num_progress_quests_completed?: number;
  item_seen?: boolean;
  playlists?: string[];
  xp_reward_scalar?: number;
  challenge_linked_quest_given?: string;
  quest_pool?: string;
  quest_state?: string;
  bucket?: string;
  last_state_change_time?: string;
  challenge_linked_quest_parent?: string;
  max_level_bonus?: number;
  xp?: number;
  quest_rarity?: string;
  favorite?: boolean;
}

@Entity()
export class BattlepassQuest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ nullable: false, default: config.currentSeason })
  season!: number;

  @Column({ type: "jsonb" })
  data!: BattlepassQuestData[];
}
