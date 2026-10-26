import "reflect-metadata";
import Fastify from "fastify";
import { bootstrap } from "fastify-decorators";
import { join } from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    transport: { target: "pino-pretty" },
  },
});

fastify.register(bootstrap, {
  directory: join(__dirname, "modules"),
  mask: /\.controller\.(ts|js)$/,
  prefix: "/api",
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "127.0.0.1";

    await fastify.listen({ port, host });
    console.log(
      `Server running in ${process.env.NODE_ENV || "development"} mode on port ${port}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
