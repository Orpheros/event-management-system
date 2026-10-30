import { Controller, GET, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service.js";

@Controller("/users")
export default class UserController {
  @Inject(UserService)
  private userService!: UserService;

  @GET("/")
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const users = await this.userService.findAll();
    return users.map((u) => u.toJSON());
  }

  @GET("/:id")
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = await this.userService.findById(request.params.id);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }
    return user.toJSON();
  }
}
