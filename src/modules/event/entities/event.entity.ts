import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  location!: string;

  @Column({ name: "start_date", type: "timestamptz" })
  startDate!: Date;

  @Column({ name: "end_date", type: "timestamptz", nullable: true })
  endDate?: Date | null;

  @Column({ type: "varchar", length: 500, default: "" })
  link!: string;

  @Column({ type: "varchar", length: 50, default: "" })
  status!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  image!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      location: this.location,
      start_date:
        this.startDate instanceof Date
          ? this.startDate.toISOString()
          : this.startDate,
      end_date:
        this.endDate instanceof Date
          ? this.endDate.toISOString()
          : this.endDate,
      link: this.link,
      status: this.status,
      image: this.image,
      created: this.createdAt
        ? this.createdAt.toISOString()
        : new Date().toISOString(),
      updated: this.updatedAt
        ? this.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }
}
