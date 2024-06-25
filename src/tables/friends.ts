import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface Friend {
  accountId: string;
  createdAt: string;
  alias: string;
}

@Entity()
export class Friends extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  accountId!: string;

  @Column("jsonb", { default: [] })
  accepted!: Friend[];

  @Column("jsonb", { default: [] })
  incoming!: Friend[];

  @Column("jsonb", { default: [] })
  outgoing!: Friend[];

  @Column("jsonb", { default: [] })
  blocked!: Friend[];
}
