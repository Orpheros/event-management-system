import { Controller, GET, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { FileService } from "../services/file.service.js";

interface FileParams {
  collection: string;
  id: string;
  filename: string;
}

@Controller("/files")
export default class FileController {
  @Inject(FileService)
  private fileService!: FileService;

  @GET("/:collection/:id/:filename")
  async serveFile(request: FastifyRequest<{ Params: FileParams }>, reply: FastifyReply) {
    const { collection, id, filename } = request.params;
    const resolvedPath = this.fileService.resolveFilePath(collection, id, filename);

    if (resolvedPath) {
      const mime = this.fileService.getMimeType(filename);
      reply.header("Content-Type", mime);
      reply.header("Cache-Control", "public, max-age=86400");
      return reply.send(this.fileService.getStream(resolvedPath));
    }

    // Fallback: If image is requested but not on disk, send SVG placeholder
    if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename)) {
      reply.header("Content-Type", "image/svg+xml");
      reply.header("Cache-Control", "public, max-age=3600");
      const cleanName = filename.replace(/\.[^/.]+$/, "").slice(0, 16);
      return reply.send(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4f46e5"/>
              <stop offset="100%" stop-color="#9333ea"/>
            </linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#g)"/>
          <text x="50%" y="48%" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" font-weight="600">Stellar Luna</text>
          <text x="50%" y="58%" text-anchor="middle" fill="#e0e7ff" font-family="system-ui, sans-serif" font-size="16">${cleanName}</text>
        </svg>`
      );
    }

    return reply.status(404).send({ error: "File not found" });
  }
}
