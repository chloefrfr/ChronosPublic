import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface Event {
  eventType: string;
  activeUntil: string;
  activeSince: string;
}

@Entity()
export class Timeline extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  eventName!: string;

  @Column()
  activeUntil!: string;

  @Column()
  activeSince!: string;

  @Column()
  season!: number;
}
