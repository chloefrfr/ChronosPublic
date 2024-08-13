import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum TokenTypes {
  AccessToken = "accesstoken",
  RefreshToken = "refreshtoken",
  ClientToken = "clientoken",
}

@Entity()
export class Tokens extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  accountId!: string;

  @Column()
  type!: string;

  @Column()
  token!: string;

  @Column()
  clientId!: string;

  @Column()
  grant!: string;
}
