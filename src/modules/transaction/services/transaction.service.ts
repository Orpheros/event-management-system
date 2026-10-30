import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Transaction } from "../entities/transaction.entity.js";
import { generateId } from "../../../utils/id.js";
import { transactionBus } from "../../../utils/event-bus.js";

export interface ItemPayload {
  id?: string;
  name: string;
  quantity: number | string;
}

@Service()
export class TransactionService {
  private memoryTransactions: Map<string, Transaction> = new Map();

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
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Transaction);
      return await repo.find({ order: { createdAt: "DESC" } });
    }
    return Array.from(this.memoryTransactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async findById(id: string): Promise<Transaction | null> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Transaction);
      return await repo.findOneBy({ id });
    }
    return this.memoryTransactions.get(id) || null;
  }

  public async createPO(payload: {
    id?: string;
    name: string;
    eventDate: string;
    items: unknown;
    notes?: string;
    receipt?: string;
  }): Promise<Transaction> {
    const { quantity, memberSummary } = this.parseItems(payload.items);

    const tx = new Transaction();
    tx.id = payload.id || generateId();
    tx.name = payload.name;
    tx.eventDate = payload.eventDate;
    tx.member = memberSummary;
    tx.quantity = quantity;
    tx.receipt = payload.receipt || "";
    tx.type = "PO";
    tx.status = "pending";
    tx.notes = payload.notes || "";
    tx.createdAt = new Date();
    tx.updatedAt = new Date();

    let saved: Transaction;
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Transaction);
      saved = await repo.save(tx);
    } else {
      this.memoryTransactions.set(tx.id, tx);
      saved = tx;
    }

    transactionBus.emitTransaction({
      action: "create",
      record: saved.toJSON(),
    });

    return saved;
  }

  public async createOTS(payload: {
    id?: string;
    name: string;
    eventDate: string;
    items: unknown;
    notes?: string;
  }): Promise<Transaction> {
    const { quantity, memberSummary } = this.parseItems(payload.items);

    const tx = new Transaction();
    tx.id = payload.id || generateId();
    tx.name = payload.name;
    tx.eventDate = payload.eventDate;
    tx.member = memberSummary;
    tx.quantity = quantity;
    tx.receipt = "";
    tx.type = "OTS";
    tx.status = "confirmed";
    tx.notes = payload.notes || "";
    tx.createdAt = new Date();
    tx.updatedAt = new Date();

    let saved: Transaction;
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Transaction);
      saved = await repo.save(tx);
    } else {
      this.memoryTransactions.set(tx.id, tx);
      saved = tx;
    }

    transactionBus.emitTransaction({
      action: "create",
      record: saved.toJSON(),
    });

    return saved;
  }

  public async update(id: string, payload: Partial<Transaction>): Promise<Transaction> {
    let updated: Transaction;

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Transaction);
      const tx = await repo.findOneBy({ id });
      if (!tx) throw new Error("Transaction not found");

      if (payload.status !== undefined) tx.status = payload.status;
      if (payload.name !== undefined) tx.name = payload.name;
      if (payload.eventDate !== undefined) tx.eventDate = payload.eventDate;
      if (payload.member !== undefined) tx.member = payload.member;
      if (payload.notes !== undefined) tx.notes = payload.notes;
      tx.updatedAt = new Date();

      updated = await repo.save(tx);
    } else {
      const tx = this.memoryTransactions.get(id);
      if (!tx) throw new Error("Transaction not found");

      if (payload.status !== undefined) tx.status = payload.status;
      if (payload.name !== undefined) tx.name = payload.name;
      if (payload.eventDate !== undefined) tx.eventDate = payload.eventDate;
      if (payload.member !== undefined) tx.member = payload.member;
      if (payload.notes !== undefined) tx.notes = payload.notes;
      tx.updatedAt = new Date();

      this.memoryTransactions.set(id, tx);
      updated = tx;
    }

    transactionBus.emitTransaction({
      action: "update",
      record: updated.toJSON(),
    });

    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    let success = false;
    let deletedRecord: Record<string, unknown> = { id };

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Transaction);
      const existing = await repo.findOneBy({ id });
      if (existing) {
        deletedRecord = existing.toJSON();
      }
      const res = await repo.delete({ id });
      success = (res.affected || 0) > 0;
    } else {
      const existing = this.memoryTransactions.get(id);
      if (existing) {
        deletedRecord = existing.toJSON();
      }
      success = this.memoryTransactions.delete(id);
    }

    if (success) {
      transactionBus.emitTransaction({
        action: "delete",
        record: deletedRecord,
      });
    }

    return success;
  }
}
