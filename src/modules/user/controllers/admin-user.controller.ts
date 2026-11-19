import { Controller, GET, PUT, POST, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service.js";
import { adminGuard } from "../../auth/guards/auth.guard.js";

interface UpdateRoleBody {
  id: string;
  role?: "admin" | "member";
  stellar_role?: "admin" | "member";
}

interface CreateUserBody {
  email?: string;
  password?: string;
  name?: string;
  role?: "admin" | "member";
  stellar_role?: "admin" | "member";
}

@Controller("/admin/users")
export default class AdminUserController {
  @Inject(UserService)
  private userService!: UserService;

  @GET("/", { onRequest: adminGuard })
  async getStaffUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.findAll();
    return users.map((u) => u.toJSON());
  }

  @POST("/", { onRequest: adminGuard })
  async createUser(
    request: FastifyRequest<{ Body: CreateUserBody }>,
    reply: FastifyReply
  ) {
    const { email, password, name, role, stellar_role } = request.body || {};
    if (!email || !password) {
      return reply.status(400).send({ error: "email and password are required" });
    }

    const existing = await this.userService.findByEmail(email);
    if (existing) {
      return reply.status(409).send({ error: "A user with this email already exists" });
    }

    const created = await this.userService.create({
      email,
      password,
      name,
      role: (role || stellar_role) === "admin" ? "admin" : "member",
    });
    return reply.status(201).send(created.toJSON());
  }

  @PUT("/", { onRequest: adminGuard })
  async updateUserRole(
    request: FastifyRequest<{ Body: UpdateRoleBody }>,
    reply: FastifyReply
  ) {
    const { id, role, stellar_role } = request.body || {};
    const newRole = (role || stellar_role) as "admin" | "member";
    if (!id || !newRole) {
      return reply.status(400).send({ error: "id and role are required" });
    }

    try {
      const updated = await this.userService.updateRole(Number(id), newRole);
      return updated.toJSON();
    } catch (err: unknown) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  }
}
