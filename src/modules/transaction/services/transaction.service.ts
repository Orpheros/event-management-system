import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Transaction } from "../entities/transaction.entity.js";
import { transactionBus } from "../../../utils/event-bus.js";

export interface ItemPayload {
  id?: string;
  name: string;
  quantity: number | string;
}

@Service()
export class TransactionService {
  private get repo() {
    return AppDataSource.getRepository(Transaction);
  }

  public parseItems(itemsInput: unknown): { quantity: number; memberSummary: string } {
    let items: ItemPayload[] = [];
    if (typeof itemsInput === "string") {
      try {
        items = JSON.parse(itemsInput);
      } catch {
        items = [];
      }
    } else if (Array.isArray(itemsInput)) {
      items = itemsInput as ItemPayload[];
    }

    let totalQuantity = 0;
    const summaryParts: string[] = [];

    for (const item of items) {
      const q = Math.max(1, Number(item.quantity) || 1);
      totalQuantity += q;
      summaryParts.push(`${item.name} (${q})`);
    }

    return {
      quantity: totalQuantity || 1,
      memberSummary: summaryParts.join(", ") || "General Ticket",
    };
  }

  public async findAll(): Promise<Transaction[]> {
    return await this.repo.find({ order: { createdAt: "DESC" } });
  }

  public async findById(id: number): Promise<Transaction | null> {
    return await this.repo.findOneBy({ id });
  }

  public async createPO(payload: {
    name: string;
    eventDate: string;
    items: unknown;
    notes?: string;
    receipt?: string;
  }): Promise<Transaction> {
    const { quantity, memberSummary } = this.parseItems(payload.items);

    const tx = new Transaction();
    tx.name = payload.name;
    tx.eventDate = payload.eventDate;
    tx.member = memberSummary;
    tx.quantity = quantity;
    tx.receipt = payload.receipt || "";
    tx.type = "PO";
    tx.status = "pending";
    tx.notes = payload.notes || "";

    const saved = await this.repo.save(tx);

    transactionBus.emitTransaction({
      action: "create",
      record: saved.toJSON(),
    });

    return saved;
  }

  public async createOTS(payload: {
    name: string;
    eventDate: string;
    items: unknown;
    notes?: string;
  }): Promise<Transaction> {
    const { quantity, memberSummary } = this.parseItems(payload.items);

    const tx = new Transaction();
    tx.name = payload.name;
    tx.eventDate = payload.eventDate;
    tx.member = memberSummary;
    tx.quantity = quantity;
    tx.receipt = "";
    tx.type = "OTS";
    tx.status = "confirmed";
    tx.notes = payload.notes || "";

    const saved = await this.repo.save(tx);

    transactionBus.emitTransaction({
      action: "create",
      record: saved.toJSON(),
    });

    return saved;
  }

  public async update(id: number, payload: Partial<Transaction>): Promise<Transaction> {
    const tx = await this.repo.findOneBy({ id });
    if (!tx) throw new Error("Transaction not found");

    if (payload.status !== undefined) tx.status = payload.status;
    if (payload.name !== undefined) tx.name = payload.name;
    if (payload.eventDate !== undefined) tx.eventDate = payload.eventDate;
    if (payload.member !== undefined) tx.member = payload.member;
    if (payload.notes !== undefined) tx.notes = payload.notes;

    const updated = await this.repo.save(tx);

    transactionBus.emitTransaction({
      action: "update",
      record: updated.toJSON(),
    });

    return updated;
  }

  public async delete(id: number): Promise<boolean> {
    const existing = await this.repo.findOneBy({ id });
    let deletedRecord: Record<string, unknown> = { id };
    if (existing) {
      deletedRecord = existing.toJSON();
    }

    const res = await this.repo.delete({ id });
    const success = (res.affected || 0) > 0;

    if (success) {
      transactionBus.emitTransaction({
        action: "delete",
        record: deletedRecord,
      });
    }

    return success;
  }
}
