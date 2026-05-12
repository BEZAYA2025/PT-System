// Idempotent schema migration runner.
// Usage: POSTGRES_URL=... node scripts/init-db.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sql } from "@vercel/postgres";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(join(here, "init-db.sql"), "utf8");

if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
  console.error("POSTGRES_URL is not set. Pull env vars from Vercel first.");
  process.exit(1);
}

try {
  await sql.query(migration);
  console.log("Schema migrated.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
