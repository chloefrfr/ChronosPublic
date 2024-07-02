import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { ServerOptions } from "../sockets/gamesessions/types";

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
  identifier!: string;

  @Column()
  address!: string;

  @Column()
  port!: number;

  @Column()
  options!: ServerOptions;
}
