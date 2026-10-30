import { Controller, POST, GET, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { TransactionService } from "../services/transaction.service.js";
import { saveUploadedFile } from "../../../utils/upload.js";
import { generateId } from "../../../utils/id.js";

interface StatusQuery {
  id?: string;
}

@Controller("/payment")
export default class PaymentController {
  @Inject(TransactionService)
  private transactionService!: TransactionService;

  @POST("/")
  async submitPreOrder(request: FastifyRequest, reply: FastifyReply) {
    const recordId = generateId();
    let fields: Record<string, string> = {};
    let receiptFilename = "";

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            receiptFilename = await saveUploadedFile("transaction", recordId, part.filename, buffer);
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }
    } else {
      fields = (request.body as Record<string, string>) || {};
      receiptFilename = fields.receipt || "";
    }

    const name = fields.name;
    const eventDate = fields.eventDate || fields.event_date;
    const items = fields.items;
    const notes = fields.notes;

    if (!name || !eventDate || !items) {
      return reply.status(400).send({
        error: "Missing required fields: name, eventDate, and items are required",
      });
    }

    const transaction = await this.transactionService.createPO({
      id: recordId,
      name,
      eventDate,
      items,
      notes,
      receipt: receiptFilename,
    });

    return {
      success: true,
      transactionId: transaction.id,
      id: transaction.id,
      record: transaction.toJSON(),
    };
  }

  @GET("/status")
  async checkStatus(request: FastifyRequest<{ Querystring: StatusQuery }>, reply: FastifyReply) {
    const id = request.query.id;
    if (!id) {
      return reply.status(400).send({ error: "Transaction id is required" });
    }

    const tx = await this.transactionService.findById(id);
    if (!tx) {
      return reply.status(404).send({ error: "Transaction not found" });
    }

    return {
      success: true,
      data: {
        id: tx.id,
        name: tx.name,
        member: tx.member,
        quantity: tx.quantity,
        eventDate: tx.eventDate,
        status: tx.status,
        created: tx.createdAt ? tx.createdAt.toISOString() : new Date().toISOString(),
      },
    };
  }
}
