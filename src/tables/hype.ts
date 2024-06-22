import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Hype {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  min_required_hype!: number;

  @Column()
  division!: number;

  @Column()
  maximum_required_hype!: number;
}
