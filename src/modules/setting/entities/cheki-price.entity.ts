import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("cheki_prices")
export class ChekiPrice {
  @PrimaryColumn({ type: "varchar", length: 15 })
  id!: string;

  @Column({ type: "varchar", length: 20, unique: true })
  type!: "po" | "ots";

  @Column({ type: "integer" })
  price!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      price: this.price,
      created: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
      updated: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
      collectionId: "cheki_price",
      collectionName: "cheki_price",
    };
  }
}
