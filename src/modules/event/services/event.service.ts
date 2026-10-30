import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Event } from "../entities/event.entity.js";
import { generateId } from "../../../utils/id.js";

export interface EventInput {
  id?: string;
  title?: string;
  description?: string;
  location?: string;
  start_date?: string | Date;
  end_date?: string | Date | null;
  startDate?: string | Date;
  endDate?: string | Date | null;
  variant?: "primary" | "success" | "warning" | "danger";
  status?: string;
  image?: string;
}

@Service()
export class EventService {
  private memoryEvents: Map<string, Event> = new Map();

  constructor() {
    this.seedDefaultMemoryEvents();
  }

  private seedDefaultMemoryEvents() {
    const event = new Event();
    event.id = "5hot6qw6t16064o";
    event.title = "Event Stellar Luna";
    event.description = "JIEXPO Event";
    event.location = "Lippo Kramat Jati";
    event.startDate = new Date("2026-04-22T00:00:00.000Z");
    event.endDate = new Date("2026-04-22T00:00:00.000Z");
    event.variant = "success";
    event.status = "pre_sale";
    event.image = "";
    event.createdAt = new Date();
    event.updatedAt = new Date();
    this.memoryEvents.set(event.id, event);
  }

  public async findRaw(): Promise<Event[]> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Event);
      return await repo.find({ order: { startDate: "ASC" } });
    }
    return Array.from(this.memoryEvents.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  public async findForCalendar() {
    const events = await this.findRaw();
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startDate: e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
      endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
      start_date: e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
      end_date: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
      variant: e.variant,
      status: e.status,
      location: e.location,
    }));
  }

  public async findById(id: string): Promise<Event | null> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Event);
      return await repo.findOneBy({ id });
    }
    return this.memoryEvents.get(id) || null;
  }

  public async create(data: EventInput): Promise<Event> {
    const event = new Event();
    event.id = data.id || generateId();
    event.title = data.title || "";
    event.description = data.description || "";
    event.location = data.location || "";
    event.startDate = new Date(data.startDate || data.start_date || new Date());
    event.endDate = (data.endDate || data.end_date) ? new Date(data.endDate || data.end_date!) : null;
    event.variant = (data.variant as "primary" | "success" | "warning" | "danger") || "primary";
    event.status = data.status || "";
    event.image = data.image || "";
    event.createdAt = new Date();
    event.updatedAt = new Date();

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Event);
      return await repo.save(event);
    }
    this.memoryEvents.set(event.id, event);
    return event;
  }

  public async update(id: string, data: EventInput): Promise<Event> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Event);
      const event = await repo.findOneBy({ id });
      if (!event) throw new Error("Event not found");

      if (data.title !== undefined) event.title = data.title;
      if (data.description !== undefined) event.description = data.description;
      if (data.location !== undefined) event.location = data.location;
      if (data.startDate || data.start_date) event.startDate = new Date(data.startDate || data.start_date!);
      if (data.endDate !== undefined || data.end_date !== undefined) {
        event.endDate = (data.endDate || data.end_date) ? new Date(data.endDate || data.end_date!) : null;
      }
      if (data.variant !== undefined) event.variant = data.variant as "primary" | "success" | "warning" | "danger";
      if (data.status !== undefined) event.status = data.status;
      if (data.image !== undefined) event.image = data.image;
      event.updatedAt = new Date();

      return await repo.save(event);
    }

    const event = this.memoryEvents.get(id);
    if (!event) throw new Error("Event not found");

    if (data.title !== undefined) event.title = data.title;
    if (data.description !== undefined) event.description = data.description;
    if (data.location !== undefined) event.location = data.location;
    if (data.startDate || data.start_date) event.startDate = new Date(data.startDate || data.start_date!);
    if (data.endDate !== undefined || data.end_date !== undefined) {
      event.endDate = (data.endDate || data.end_date) ? new Date(data.endDate || data.end_date!) : null;
    }
    if (data.variant !== undefined) event.variant = data.variant as "primary" | "success" | "warning" | "danger";
    if (data.status !== undefined) event.status = data.status;
    if (data.image !== undefined) event.image = data.image;
    event.updatedAt = new Date();

    this.memoryEvents.set(id, event);
    return event;
  }

  public async delete(id: string): Promise<boolean> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Event);
      const res = await repo.delete({ id });
      return (res.affected || 0) > 0;
    }
    return this.memoryEvents.delete(id);
  }
}
