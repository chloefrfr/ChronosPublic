import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type ItemTypes = "storefront";

@Entity()
export class Item {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  type!: ItemTypes;

  @Column({ type: "jsonb" })
  data: any;
}