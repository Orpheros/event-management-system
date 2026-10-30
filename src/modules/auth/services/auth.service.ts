import { Service, Inject, FastifyInstanceToken } from "fastify-decorators";
import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { UserService } from "../../user/services/user.service.js";

@Service()
export class AuthService {
  @Inject(FastifyInstanceToken)
  private fastify!: FastifyInstance;

  @Inject(UserService)
  private userService!: UserService;

  public async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  public signToken(user: { id: string; email: string; stellarRole: string }) {
    return this.fastify.jwt.sign(
      {
        id: user.id,
        email: user.email,
        stellar_role: user.stellarRole,
      },
      { expiresIn: "7d" }
    );
  }

  public async getUserById(id: string) {
    return await this.userService.findById(id);
  }
}
