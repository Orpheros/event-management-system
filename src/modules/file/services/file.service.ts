import { Service } from "fastify-decorators";
import { promises as fs, createReadStream, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { nanoid } from "nanoid";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "upload";

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

  // Saves an uploaded multipart file under <root>/ and returns the stored
  // filename. Path is driven by UPLOAD_DIR env for later change.
  public async save(
    original: string,
    data: NodeJS.ReadableStream,
  ): Promise<string> {
    const dir = join(process.cwd(), UPLOAD_ROOT);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${nanoid()}${extname(original).toLowerCase()}`;
    await pipeline(data, createWriteStream(join(dir, filename)));

    return filename;
  }
}
