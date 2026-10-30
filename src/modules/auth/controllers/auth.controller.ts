import { Controller, POST, GET, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";

interface LoginBody {
  email?: string;
  identity?: string;
  password?: string;
}

@Controller("/auth")
export default class AuthController {
  @Inject(AuthService)
  private authService!: AuthService;

  @POST("/login")
  async login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const email = request.body?.email || request.body?.identity;
    const password = request.body?.password;

    if (!email || !password) {
      return reply.status(400).send({ error: "Email/identity and password are required" });
    }

    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const token = this.authService.signToken(user);
    return {
      token,
      record: user.toJSON(),
    };
  }

  @POST("/refresh")
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const decoded = await request.jwtVerify<{ id: string }>();
      const user = await this.authService.getUserById(decoded.id);
      if (!user) {
        return reply.status(401).send({ error: "User no longer exists" });
      }

      const newToken = this.authService.signToken(user);
      return {
        token: newToken,
        record: user.toJSON(),
      };
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }
  }

  @GET("/me")
  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const decoded = await request.jwtVerify<{ id: string }>();
      const user = await this.authService.getUserById(decoded.id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return user.toJSON();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  }

  @POST("/logout")
  async logout(request: FastifyRequest, reply: FastifyReply) {
    return { success: true };
  }
}
