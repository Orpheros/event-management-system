import { Controller, POST, GET, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { TransactionService } from "../services/transaction.service.js";
import { saveUploadedFile } from "../../../utils/upload.js";

interface StatusQuery {
  transaction_number?: string;
  transactionNumber?: string;
}

@Controller("/payment")
export default class PaymentController {
  @Inject(TransactionService)
  private transactionService!: TransactionService;

  @POST("/")
  async submitPreOrder(request: FastifyRequest, reply: FastifyReply) {
    let fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileName = "";

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            fileBuffer = buffer;
            fileName = part.filename;
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }
    } else {
      fields = (request.body as Record<string, string>) || {};
      fileName = fields.receipt || "";
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

    let transaction = await this.transactionService.createPO({
      name,
      eventDate,
      items,
      notes,
      receipt: fileBuffer ? "" : fileName,
    });

    // Save the receipt under the generated numeric id, then persist the filename
    if (fileBuffer) {
      const receiptFilename = await saveUploadedFile("transaction", String(transaction.id), fileName, fileBuffer);
      transaction = await this.transactionService.update(transaction.id, { receipt: receiptFilename });
    }

    return {
      success: true,
      transactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      id: transaction.id,
      record: transaction.toJSON(),
    };
  }

  @GET("/status")
  async checkStatus(request: FastifyRequest<{ Querystring: StatusQuery }>, reply: FastifyReply) {
    const transactionNumber = request.query.transaction_number || request.query.transactionNumber;
    if (!transactionNumber) {
      return reply.status(400).send({ error: "Transaction number is required" });
    }

    const tx = await this.transactionService.findByTransactionNumber(transactionNumber);
    if (!tx) {
      return reply.status(404).send({ error: "Transaction not found" });
    }

    return {
      success: true,
      data: {
        id: tx.id,
        transaction_number: tx.transactionNumber,
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
