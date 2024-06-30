import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Server extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: false, unique: true })
  sessionId!: string;

  @Column()
  status!: string;

  @Column()
  version!: number;

  @Column()
  port!: number;
}
