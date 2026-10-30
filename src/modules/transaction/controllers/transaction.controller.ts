import { Controller, GET, PUT, DELETE, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { TransactionService } from "../services/transaction.service.js";

interface TransactionBody {
  id?: string;
  status?: string;
  name?: string;
  eventDate?: string;
  member?: string;
  notes?: string;
}

interface DeleteQuery {
  id?: string;
}

@Controller("/transactions")
export default class TransactionController {
  @Inject(TransactionService)
  private transactionService!: TransactionService;

  @GET("/raw")
  async getRawTransactions(request: FastifyRequest, reply: FastifyReply) {
    const transactions = await this.transactionService.findAll();
    return transactions.map((t) => t.toJSON());
  }

  @PUT("/raw")
  async updateTransaction(request: FastifyRequest<{ Body: TransactionBody }>, reply: FastifyReply) {
    const { id, ...data } = request.body || {};
    if (!id) {
      return reply.status(400).send({ error: "Transaction id is required" });
    }

    try {
      const updated = await this.transactionService.update(id, data);
      return updated.toJSON();
    } catch (err: unknown) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  }

  @DELETE("/raw")
  async deleteTransaction(request: FastifyRequest<{ Querystring: DeleteQuery }>, reply: FastifyReply) {
    const id = request.query.id;
    if (!id) {
      return reply.status(400).send({ error: "Transaction id is required" });
    }

    const success = await this.transactionService.delete(id);
    return { success, id };
  }
}
