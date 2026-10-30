import { Controller, GET, PUT, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service.js";

interface UpdateRoleBody {
  id: string;
  stellar_role?: "admin" | "member";
  stellarRole?: "admin" | "member";
}

@Controller("/admin/users")
export default class AdminUserController {
  @Inject(UserService)
  private userService!: UserService;

  @GET("/")
  async getStaffUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.findAll();
    return users.map((u) => u.toJSON());
  }

  @PUT("/")
  async updateUserRole(
    request: FastifyRequest<{ Body: UpdateRoleBody }>,
    reply: FastifyReply
  ) {
    const { id, stellar_role, stellarRole } = request.body || {};
    const role = (stellar_role || stellarRole) as "admin" | "member";
    if (!id || !role) {
      return reply.status(400).send({ error: "id and stellar_role are required" });
    }

    try {
      const updated = await this.userService.updateRole(id, role);
      return updated.toJSON();
    } catch (err: unknown) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  }
}
