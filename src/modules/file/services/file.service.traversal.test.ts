// Self-check for the path-traversal guard in FileService.delete.
// Run: npx tsx src/modules/file/services/file.service.traversal.test.ts
import { promises as fs } from "node:fs";
import { join } from "node:path";
import assert from "node:assert";
import { FileService } from "./file.service.js";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || "upload";
const root = join(process.cwd(), UPLOAD_ROOT);

async function main() {
  const svc = new FileService();

  // A file outside the upload root that a traversal attack would target.
  const outside = join(process.cwd(), "traversal-victim.txt");
  await fs.writeFile(outside, "do not delete me");

  // A legitimate file inside the upload root.
  await fs.mkdir(root, { recursive: true });
  const inside = join(root, "legit.txt");
  await fs.writeFile(inside, "deletable");

  // Traversal attempts must not delete the outside file and must return false.
  for (const attack of [
    "../traversal-victim.txt",
    "../../traversal-victim.txt",
    outside, // absolute path
    "foo/../../traversal-victim.txt",
    "",
    "..",
  ]) {
    const result = await svc.delete(attack);
    assert.strictEqual(result, false, `expected false for ${JSON.stringify(attack)}`);
  }
  assert.ok(await exists(outside), "outside file must survive traversal attempts");

  // Legit deletion works and reports true.
  assert.strictEqual(await svc.delete("legit.txt"), true, "legit delete should return true");
  assert.ok(!(await exists(inside)), "legit file should be gone");

  // Missing file returns false.
  assert.strictEqual(await svc.delete("nope.txt"), false, "missing file should return false");

  await fs.unlink(outside);
  console.log("OK: path-traversal guard holds");
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
