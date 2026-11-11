import type { FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  id: string;
  email: string;
  role: "admin" | "member";
  iat?: number;
  exp?: number;
}
export async function apiKeyGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = process.env.API_KEY;
  if (!expected) {
    return reply.status(500).send({ error: "API key not configured" });
  }
  if (request.headers["x-api-key"] !== expected) {
    return reply.status(401).send({ error: "Invalid or missing API key" });
  }
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
