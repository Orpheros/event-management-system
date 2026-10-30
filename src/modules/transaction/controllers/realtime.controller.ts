import { Controller, GET } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { transactionBus } from "../../../utils/event-bus.js";

@Controller("/realtime")
export default class RealtimeController {
  @GET("/")
  async handleSSE(request: FastifyRequest, reply: FastifyReply) {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.flushHeaders();

    // Initial greeting / connect event
    reply.raw.write(`event: connected\ndata: {"status":"connected"}\n\n`);

    // Keep-alive heartbeat ping every 15s to keep connection open through proxies
    const keepAliveTimer = setInterval(() => {
      reply.raw.write(`: ping\n\n`);
    }, 15000);

    const unsubscribe = transactionBus.onTransaction((event) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // Socket closed
      }
    });

    request.raw.on("close", () => {
      clearInterval(keepAliveTimer);
      unsubscribe();
    });

    // Keep response hanging open
    return new Promise(() => {});
  }
}
