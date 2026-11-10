import type { FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  id: string;
  email: string;
  role: "admin" | "member";
  iat?: number;
  exp?: number;
}
export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export function roleGuard(...roles: Array<"admin" | "member">) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    if (!roles.includes((request.user as JwtPayload).role)) {
      return reply.status(403).send({ error: "Forbidden: insufficient role" });
    }
  };
}

export const adminGuard = roleGuard("admin");
