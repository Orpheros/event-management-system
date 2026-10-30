import { Service } from "fastify-decorators";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../../../config/database/database.js";
import { User } from "../entities/user.entity.js";
import { generateId } from "../../../utils/id.js";

@Service()
export class UserService {
  // In-memory fallback if database is not connected yet
  private memoryUsers: Map<string, User> = new Map();

  constructor() {
    this.seedDefaultMemoryUser();
  }

  private seedDefaultMemoryUser() {
    const defaultAdmin = new User();
    defaultAdmin.id = "xemmoadmin0001";
    defaultAdmin.email = "xemmo25@gmail.com";
    defaultAdmin.passwordHash = bcrypt.hashSync("password123", 10);
    defaultAdmin.name = "Super Admin";
    defaultAdmin.avatar = "";
    defaultAdmin.stellarRole = "admin";
    defaultAdmin.emailVisibility = true;
    defaultAdmin.verified = true;
    defaultAdmin.createdAt = new Date();
    defaultAdmin.updatedAt = new Date();
    this.memoryUsers.set(defaultAdmin.id, defaultAdmin);
  }

  public async findAll(): Promise<User[]> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(User);
      return await repo.find({ order: { name: "ASC" } });
    }
    return Array.from(this.memoryUsers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  public async findById(id: string): Promise<User | null> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(User);
      return await repo.findOneBy({ id });
    }
    return this.memoryUsers.get(id) || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(User);
      return await repo.findOneBy({ email });
    }
    for (const u of this.memoryUsers.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  public async updateRole(id: string, role: "admin" | "member"): Promise<User> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOneBy({ id });
      if (!user) throw new Error("User not found");
      user.stellarRole = role;
      return await repo.save(user);
    }
    const user = this.memoryUsers.get(id);
    if (!user) throw new Error("User not found");
    user.stellarRole = role;
    user.updatedAt = new Date();
    this.memoryUsers.set(id, user);
    return user;
  }

  public async create(data: Partial<User>): Promise<User> {
    const user = new User();
    user.id = data.id || generateId();
    user.email = data.email!;
    user.passwordHash = data.passwordHash || (data as { password?: string }).password ? bcrypt.hashSync((data as { password?: string }).password!, 10) : "";
    user.name = data.name || "";
    user.avatar = data.avatar || "";
    user.stellarRole = data.stellarRole || "member";
    user.emailVisibility = data.emailVisibility || false;
    user.verified = data.verified || false;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(User);
      return await repo.save(user);
    }
    this.memoryUsers.set(user.id, user);
    return user;
  }
}
