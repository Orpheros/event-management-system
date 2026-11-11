import { Service } from "fastify-decorators";
import { promises as fs, createReadStream, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { nanoid } from "nanoid";
import sharp from "sharp";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

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

  // Lists files in the upload root with size and modified time.
  public async list(): Promise<{ filename: string; url: string; size: number; modifiedAt: Date }[]> {
    const dir = join(process.cwd(), UPLOAD_ROOT);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return [];
    }

    const files = await Promise.all(
      entries.map(async (filename) => {
        const stat = await fs.stat(join(dir, filename));
        if (!stat.isFile()) return null;
        return {
          filename,
          url: `/api/files/${filename}`,
          size: stat.size,
          modifiedAt: stat.mtime,
        };
      }),
    );

    return files.filter((f): f is NonNullable<typeof f> => f !== null);
  }

  // Saves an uploaded multipart file under <root>/ and returns the stored
  // filename. Images are compressed to WebP (max 1920px, quality 80); other
  // types pass through. Path is driven by UPLOAD_DIR env for later change.
  public async save(
    original: string,
    data: NodeJS.ReadableStream,
  ): Promise<string> {
    const dir = join(process.cwd(), UPLOAD_ROOT);
    await fs.mkdir(dir, { recursive: true });

    const ext = extname(original).toLowerCase();

    if (IMAGE_EXT.has(ext)) {
      const filename = `${nanoid()}.webp`;
      await pipeline(
        data,
        sharp().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 80 }),
        createWriteStream(join(dir, filename)),
      );
      return filename;
    }

    const filename = `${nanoid()}${ext}`;
    await pipeline(data, createWriteStream(join(dir, filename)));

    return filename;
  }
}
