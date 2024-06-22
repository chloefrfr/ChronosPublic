import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Hype {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  minimum_required_hype!: number;

  @Column()
  division!: number;

  @Column({ type: "bigint" })
  maximum_required_hype!: string;
}
