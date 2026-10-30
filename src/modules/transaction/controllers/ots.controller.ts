import { Controller, POST, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { TransactionService } from "../services/transaction.service.js";
import { generateId } from "../../../utils/id.js";

interface OTSBody {
  name: string;
  eventDate?: string;
  event_date?: string;
  items: unknown;
  notes?: string;
}

@Controller("/ots")
export default class OTSController {
  @Inject(TransactionService)
  private transactionService!: TransactionService;

  @POST("/")
  async submitOTS(request: FastifyRequest<{ Body: OTSBody }>, reply: FastifyReply) {
    let body = request.body || ({} as OTSBody);

    if (request.isMultipart()) {
      const fields: Record<string, unknown> = {};
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type !== "file") {
          fields[part.fieldname] = part.value;
        }
      }
      body = fields as unknown as OTSBody;
    }

    const name = body.name;
    const eventDate = body.eventDate || body.event_date;
    const items = body.items;
    const notes = body.notes;

    if (!name || !eventDate || !items) {
      return reply.status(400).send({
        error: "Missing required fields: name, eventDate, and items are required",
      });
    }

    const transaction = await this.transactionService.createOTS({
      id: generateId(),
      name,
      eventDate,
      items,
      notes,
    });

    return {
      success: true,
      transactionId: transaction.id,
      id: transaction.id,
      record: transaction.toJSON(),
    };
  }
}
