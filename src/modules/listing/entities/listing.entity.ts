import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("listings")
export class Listing {
  @PrimaryColumn({ type: "varchar", length: 15 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "integer" })
  price!: number;

  @Column({ type: "varchar", length: 100, default: "" })
  category!: string;

  @Column({ type: "numeric", precision: 3, scale: 2, default: 0 })
  rating!: number;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  image!: string;

  @Column({ type: "text", default: "[]" })
  images!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  toJSON() {
    let parsedImages = [];
    try {
      parsedImages = JSON.parse(this.images || "[]");
    } catch {
      parsedImages = [];
    }

    return {
      id: this.id,
      name: this.name,
      price: this.price,
      category: this.category,
      rating: Number(this.rating) || 0,
      description: this.description,
      image: this.image,
      images: parsedImages,
      created: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
      updated: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
      collectionId: "listings",
      collectionName: "listings",
    };
  }
}
