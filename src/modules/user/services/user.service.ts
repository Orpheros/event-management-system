import { Service } from "fastify-decorators";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../../../config/database/database.js";
import { User } from "../entities/user.entity.js";

@Service()
export class UserService {
  private get repo() {
    return AppDataSource.getRepository(User);
  }

  public async findAll(): Promise<User[]> {
    return await this.repo.find({ order: { name: "ASC" } });
  }

  public async findById(id: number): Promise<User | null> {
    return await this.repo.findOneBy({ id });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return await this.repo.findOneBy({ email });
  }

  public async updateRole(id: number, role: "admin" | "member"): Promise<User> {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new Error("User not found");
    user.role = role;
    return await this.repo.save(user);
  }

  public async create(data: Partial<User> & { password?: string }): Promise<User> {
    const user = new User();
    user.email = data.email!;
    user.passwordHash = data.passwordHash
      ? data.passwordHash
      : data.password
        ? bcrypt.hashSync(data.password, 10)
        : "";
    user.name = data.name || "";
    user.avatar = data.avatar || "";
    user.role = data.role || "member";
    user.emailVisibility = data.emailVisibility || false;
    user.verified = data.verified || false;

    return await this.repo.save(user);
  }
}
