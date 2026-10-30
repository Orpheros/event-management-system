import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { bootstrap } from "fastify-decorators";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { AppDataSource } from "./config/database/database.js";
import { seedDatabase } from "./config/database/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    transport: { target: "pino-pretty" },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Register JWT
await fastify.register(jwt, {
  secret:
    process.env.JWT_SECRET || "super-secret-stellar-luna-jwt-token-key-2026",
});

// Register Multipart (File uploads up to 5MB)
await fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Register modular controllers via fastify-decorators
await fastify.register(bootstrap, {
  directory: join(__dirname, "modules"),
  mask: /\.controller\.(ts|js)$/,
  prefix: "/api",
});

// Root & Health check endpoint
fastify.get("/", async () => {
  return {
    status: "ok",
    name: "Stellar Luna Fastify Backend",
    database: AppDataSource.isInitialized
      ? "connected (PostgreSQL)"
      : "disconnected (ready to connect)",
    timestamp: new Date().toISOString(),
  };
});

fastify.get("/health", async () => {
  return {
    status: "ok",
    database: AppDataSource.isInitialized ? "connected" : "disconnected",
  };
});

const start = async () => {
  try {
    // Attempt database connection gracefully
    try {
      await AppDataSource.initialize();
      console.log("PostgreSQL database connected successfully.");
      await seedDatabase();
    } catch (dbErr) {
      console.warn(
        "PostgreSQL database not connected yet:",
        (dbErr as Error).message,
      );
      console.log(
        "ℹServer running with in-memory store. You can connect PostgreSQL anytime.",
      );
    }

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "127.0.0.1";

    await fastify.listen({ port, host });
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on http://${host}:${port}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
