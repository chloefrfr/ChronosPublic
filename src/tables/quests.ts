import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from "typeorm";

@Entity("quests")
export class Quests extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar" })
  accountId!: string;

  @Column({ type: "varchar" })
  profileId!: string;

  @Column({ type: "varchar" })
  templateId!: string;

  @Column({ type: "jsonb" })
  entity!: any;

  @Column({ type: "boolean" })
  isDaily!: boolean;

  @Column({ type: "int" })
  season!: number;
}
