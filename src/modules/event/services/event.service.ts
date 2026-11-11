import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Event } from "../entities/event.entity.js";

export interface EventInput {
  title?: string;
  description?: string;
  location?: string;
  start_date?: string | Date;
  end_date?: string | Date | null;
  startDate?: string | Date;
  endDate?: string | Date | null;
  link?: string;
  status?: string;
  image?: string;
}

@Service()
export class EventService {
  private get repo() {
    return AppDataSource.getRepository(Event);
  }

  public async findRaw(): Promise<Event[]> {
    return await this.repo.find({ order: { startDate: "ASC" } });
  }

  public async findForCalendar() {
    const events = await this.findRaw();
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start_date:
        e.startDate instanceof Date ? e.startDate.toISOString() : e.startDate,
      end_date: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
      link: e.link,
      status: e.status,
      location: e.location,
    }));
  }

  public async findById(id: number): Promise<Event | null> {
    return await this.repo.findOneBy({ id });
  }

  public async create(data: EventInput): Promise<Event> {
    const event = new Event();
    event.title = data.title || "";
    event.description = data.description || "";
    event.location = data.location || "";
    event.startDate = new Date(data.startDate || data.start_date || new Date());
    event.endDate =
      data.endDate || data.end_date
        ? new Date(data.endDate || data.end_date!)
        : null;
    event.link = data.link || "";
    event.status = data.status || "";
    event.image = data.image || "";

    return await this.repo.save(event);
  }

  public async update(id: number, data: EventInput): Promise<Event> {
    const event = await this.repo.findOneBy({ id });
    if (!event) throw new Error("Event not found");

    if (data.title !== undefined) event.title = data.title;
    if (data.description !== undefined) event.description = data.description;
    if (data.location !== undefined) event.location = data.location;
    if (data.startDate || data.start_date)
      event.startDate = new Date(data.startDate || data.start_date!);
    if (data.endDate !== undefined || data.end_date !== undefined) {
      event.endDate =
        data.endDate || data.end_date
          ? new Date(data.endDate || data.end_date!)
          : null;
    }
    if (data.link !== undefined) event.link = data.link;
    if (data.status !== undefined) event.status = data.status;
    if (data.image !== undefined) event.image = data.image;

    return await this.repo.save(event);
  }

  public async delete(id: number): Promise<boolean> {
    const res = await this.repo.delete({ id });
    return (res.affected || 0) > 0;
  }
}
