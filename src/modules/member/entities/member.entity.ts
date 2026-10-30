import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("members")
export class Member {
  @PrimaryColumn({ type: "varchar", length: 15 })
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100, default: "" })
  role!: string;

  @Column({ type: "text", default: "" })
  hobby!: string;

  @Column({ type: "text", default: "" })
  notes!: string;

  @Column({ type: "varchar", length: 50, default: "" })
  birthdate!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  image!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  instagram!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  toJSON() {
    return {
      id: this.id,
      slug: this.slug,
      name: this.name,
      role: this.role,
      hobby: this.hobby,
      notes: this.notes,
      birthdate: this.birthdate,
      image: this.image,
      instagram: this.instagram,
      created: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
      updated: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
      collectionId: "members",
      collectionName: "members",
    };
  }
}
