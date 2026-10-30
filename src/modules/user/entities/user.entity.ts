import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryColumn({ type: "varchar", length: 15 })
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  name!: string;

  @Column({ type: "varchar", length: 255, default: "" })
  avatar!: string;

  @Column({ name: "stellar_role", type: "varchar", length: 50, default: "member" })
  stellarRole!: "admin" | "member";

  @Column({ name: "email_visibility", type: "boolean", default: false })
  emailVisibility!: boolean;

  @Column({ type: "boolean", default: false })
  verified!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      stellar_role: this.stellarRole,
      stellarRole: this.stellarRole,
      emailVisibility: this.emailVisibility,
      verified: this.verified,
      created: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
      updated: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
      collectionId: "_pb_users_auth_",
      collectionName: "users",
    };
  }
}
