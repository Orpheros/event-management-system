import {
  Controller,
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
  Inject,
} from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { EventService } from "../services/event.service.js";

interface EventBody {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  link?: string;
  status?: string;
  image?: string;
}

interface DeleteQuery {
  id?: string;
}

@Controller("/events")
export default class EventController {
  @Inject(EventService)
  private eventService!: EventService;

  @GET("/")
  async getEvents(request: FastifyRequest, reply: FastifyReply) {
    const events = await this.eventService.findRaw();
    return events.map((e) => e.toJSON());
  }

  @GET("/calendar")
  async getCalendarEvents(request: FastifyRequest, reply: FastifyReply) {
    return await this.eventService.findForCalendar();
  }

  @POST("/")
  async createEvent(
    request: FastifyRequest<{ Body: EventBody }>,
    reply: FastifyReply,
  ) {
    const data = request.body || {};
    const created = await this.eventService.create(data);
    return created.toJSON();
  }

  @PUT("/")
  async updateEvent(
    request: FastifyRequest<{ Body: EventBody }>,
    reply: FastifyReply,
  ) {
    const { id, ...data } = request.body || {};
    if (!id) {
      return reply.status(400).send({ error: "Event id is required" });
    }
    const updated = await this.eventService.update(Number(id), data);
    return updated.toJSON();
  }

  @PATCH("/")
  async patchEvent(
    request: FastifyRequest<{ Body: EventBody }>,
    reply: FastifyReply,
  ) {
    const { id, ...data } = request.body || {};
    if (!id) {
      return reply.status(400).send({ error: "Event id is required" });
    }
    const updated = await this.eventService.update(Number(id), data);
    return updated.toJSON();
  }

  @DELETE("/")
  async deleteEvent(
    request: FastifyRequest<{ Querystring: DeleteQuery }>,
    reply: FastifyReply,
  ) {
    const id = request.query.id;
    if (!id) {
      return reply
        .status(400)
        .send({ error: "Event id query parameter is required" });
    }
    await this.eventService.delete(Number(id));
    return { success: true, id };
  }
}
