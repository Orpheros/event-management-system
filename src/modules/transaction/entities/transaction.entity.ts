import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("transactions")
export class Transaction {
  @PrimaryColumn({ type: "varchar", length: 15 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ name: "event_date", type: "varchar", length: 255 })
  eventDate!: string;

  @Column({ type: "text" })
  member!: string;

  @Column({ type: "integer", default: 1 })
  quantity!: number;

  @Column({ type: "varchar", length: 255, default: "" })
  receipt!: string;

  @Column({ type: "varchar", length: 20, default: "PO" })
  type!: "PO" | "OTS";

  @Column({ type: "varchar", length: 255, default: "pending" })
  status!: string;

  @Column({ type: "text", default: "" })
  notes!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      eventDate: this.eventDate,
      event_date: this.eventDate,
      member: this.member,
      quantity: this.quantity,
      receipt: this.receipt,
      type: this.type,
      status: this.status,
      notes: this.notes,
      created: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
      updated: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
      collectionId: "transaction",
      collectionName: "transaction",
    };
  }
}
