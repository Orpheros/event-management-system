import { Service } from "fastify-decorators";
import { promises as fs, createReadStream, existsSync } from "node:fs";
import { join, extname } from "node:path";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "uploads";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

@Service()
export class FileService {
  public resolveFilePath(collection: string, recordId: string, filename: string): string | null {
    const candidates = [
      join(process.cwd(), UPLOAD_ROOT, collection, recordId, filename),
      join(process.cwd(), UPLOAD_ROOT, collection, filename),
      join(process.cwd(), UPLOAD_ROOT, filename),
      join(process.cwd(), "public", filename),
    ];

    for (const p of candidates) {
      if (existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  public getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    return MIME_MAP[ext] || "application/octet-stream";
  }

  public getStream(filePath: string) {
    return createReadStream(filePath);
  }
}
