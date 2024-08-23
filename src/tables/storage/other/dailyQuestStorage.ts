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
}

interface ObjectiveState {
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
