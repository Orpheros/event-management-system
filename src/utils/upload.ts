import { promises as fs } from "node:fs";
import { join, extname } from "node:path";
import { generateId } from "./id.js";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "uploads";

export async function ensureUploadDir(collection: string, recordId?: string): Promise<string> {
  const dir = recordId
    ? join(process.cwd(), UPLOAD_ROOT, collection, recordId)
    : join(process.cwd(), UPLOAD_ROOT, collection);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUploadedFile(
  collection: string,
  recordId: string,
  originalFilename: string,
  buffer: Buffer
): Promise<string> {
  const dir = await ensureUploadDir(collection, recordId);
  const ext = extname(originalFilename || ".bin").toLowerCase();
  const safeBase = (originalFilename || "file")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);
  const uniqueName = `${safeBase}_${generateId()}${ext}`;
  const filePath = join(dir, uniqueName);
  await fs.writeFile(filePath, buffer);
  return uniqueName;
}

export function getUploadFilePath(collection: string, recordId: string, filename: string): string {
  return join(process.cwd(), UPLOAD_ROOT, collection, recordId, filename);
}
