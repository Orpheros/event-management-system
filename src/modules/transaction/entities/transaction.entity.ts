import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from "typeorm";
import { customAlphabet } from "nanoid";

// Opaque, URL-safe transaction number (e.g. "TRX-7FQ2K9 XB3M1D"). Unambiguous alphabet (no 0/O/1/I).
const generateTransactionNumber = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 12);

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "transaction_number", type: "varchar", length: 32, unique: true })
  transactionNumber!: string;

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

  @BeforeInsert()
  assignTransactionNumber() {
    if (!this.transactionNumber) {
      this.transactionNumber = `TRX-${generateTransactionNumber()}`;
    }
  }

  toJSON() {
    return {
      id: this.id,
      transaction_number: this.transactionNumber,
      name: this.name,
      event_date: this.eventDate,
      member: this.member,
      quantity: this.quantity,
      receipt: this.receipt,
      type: this.type,
      status: this.status,
      notes: this.notes,
      created: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
      updated: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
