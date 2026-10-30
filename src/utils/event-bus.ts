import { EventEmitter } from "node:events";

export interface TransactionRealtimeEvent {
  action: "create" | "update" | "delete";
  record: Record<string, unknown>;
}

class TransactionBus extends EventEmitter {
  emitTransaction(event: TransactionRealtimeEvent) {
    this.emit("transaction", event);
  }

  onTransaction(listener: (event: TransactionRealtimeEvent) => void) {
    this.on("transaction", listener);
    return () => {
      this.off("transaction", listener);
    };
  }
}

export const transactionBus = new TransactionBus();
