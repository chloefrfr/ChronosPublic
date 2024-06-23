import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

interface Friend {
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

  @Column("simple-array", { default: [] })
  accepted!: Friend[];

  @Column("simple-array", { default: [] })
  incoming!: Friend[];

  @Column("simple-array", { default: [] })
  outgoing!: Friend[];

  @Column("simple-array", { default: [] })
  blocked!: Friend[];
}
