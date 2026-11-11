import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Listing } from "../entities/listing.entity.js";

@Service()
export class ListingService {
  private memoryListings: Map<number, Listing> = new Map();
  private memorySeq = 1;

  public async findAll(): Promise<Listing[]> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Listing);
      return await repo.find({ order: { createdAt: "DESC" } });
    }
    return Array.from(this.memoryListings.values());
  }

  public async findById(id: number): Promise<Listing | null> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Listing);
      return await repo.findOneBy({ id });
    }
    return this.memoryListings.get(id) || null;
  }

  public async create(data: Partial<Listing>): Promise<Listing> {
    const listing = new Listing();
    listing.name = data.name || "";
    listing.price = data.price || 0;
    listing.category = data.category || "";
    listing.rating = data.rating || 0;
    listing.description = data.description || "";
    listing.image = data.image || "";
    listing.images = typeof data.images === "string" ? data.images : JSON.stringify(data.images || []);
    listing.createdAt = new Date();
    listing.updatedAt = new Date();

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Listing);
      return await repo.save(listing);
    }
    listing.id = this.memorySeq++;
    this.memoryListings.set(listing.id, listing);
    return listing;
  }

  public async update(id: number, data: Partial<Listing>): Promise<Listing> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Listing);
      const listing = await repo.findOneBy({ id });
      if (!listing) throw new Error("Listing not found");

      if (data.name !== undefined) listing.name = data.name;
      if (data.price !== undefined) listing.price = data.price;
      if (data.category !== undefined) listing.category = data.category;
      if (data.rating !== undefined) listing.rating = data.rating;
      if (data.description !== undefined) listing.description = data.description;
      if (data.image !== undefined) listing.image = data.image;
      if (data.images !== undefined) {
        listing.images = typeof data.images === "string" ? data.images : JSON.stringify(data.images);
      }
      listing.updatedAt = new Date();

      return await repo.save(listing);
    }

    const listing = this.memoryListings.get(id);
    if (!listing) throw new Error("Listing not found");

    if (data.name !== undefined) listing.name = data.name;
    if (data.price !== undefined) listing.price = data.price;
    if (data.category !== undefined) listing.category = data.category;
    if (data.rating !== undefined) listing.rating = data.rating;
    if (data.description !== undefined) listing.description = data.description;
    if (data.image !== undefined) listing.image = data.image;
    if (data.images !== undefined) {
      listing.images = typeof data.images === "string" ? data.images : JSON.stringify(data.images);
    }
    listing.updatedAt = new Date();

    this.memoryListings.set(id, listing);
    return listing;
  }

  public async delete(id: number): Promise<boolean> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Listing);
      const res = await repo.delete({ id });
      return (res.affected || 0) > 0;
    }
    return this.memoryListings.delete(id);
  }
}
