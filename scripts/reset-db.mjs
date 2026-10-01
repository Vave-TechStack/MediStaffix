/**
 * Regenerates data/db.json from the deterministic seed.
 *
 * Run after changing src/lib/seed.ts so the persisted dataset matches the code,
 * or to clear data created while testing the demo.
 */

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const DB = resolve(ROOT, "data/db.json");

async function main() {
  if (process.env.MSX_KEEP_DB === "1" && existsSync(DB)) {
    console.log("MSX_KEEP_DB=1 and data/db.json exists — leaving it alone.");
    return;
  }
  if (existsSync(DB)) rmSync(DB);
  console.log("Removed data/db.json; the next read will regenerate it from the seed.");
}

main();
