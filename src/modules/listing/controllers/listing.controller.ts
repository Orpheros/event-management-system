import { Controller, GET, POST, PUT, DELETE, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ListingService } from "../services/listing.service.js";
import { Listing } from "../entities/listing.entity.js";

@Controller("/listings")
export default class ListingController {
  @Inject(ListingService)
  private listingService!: ListingService;

  @GET("/")
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const listings = await this.listingService.findAll();
    return listings.map((l) => l.toJSON());
  }

  @GET("/:id")
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const listing = await this.listingService.findById(request.params.id);
    if (!listing) {
      return reply.status(404).send({ error: "Listing not found" });
    }
    return listing.toJSON();
  }

  @POST("/")
  async create(request: FastifyRequest<{ Body: Partial<Listing> }>, reply: FastifyReply) {
    const created = await this.listingService.create(request.body || {});
    return created.toJSON();
  }

  @PUT("/:id")
  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<Listing> }>,
    reply: FastifyReply
  ) {
    try {
      const updated = await this.listingService.update(request.params.id, request.body || {});
      return updated.toJSON();
    } catch (err: unknown) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  }

  @DELETE("/:id")
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const success = await this.listingService.delete(request.params.id);
    return { success, id: request.params.id };
  }
}
