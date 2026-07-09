/**
 * Simple logical backup before bulk edits.
 *   pnpm db:backup
 * Writes ./backups/db-backup-<timestamp>.sql (gitignored). Requires `pg_dump`
 * on PATH (ships with the Postgres client tools). This is a convenience backstop
 * on top of Neon's point-in-time restore — keep PITR enabled too.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const dir = path.resolve("backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.join(dir, `db-backup-${stamp}.sql`);

try {
  execFileSync("pg_dump", [url, "--no-owner", "--no-privileges", "-f", out], {
    stdio: "inherit",
  });
  console.log(`✅ Backup written to ${out}`);
} catch (e) {
  console.error(
    "❌ pg_dump failed. Install the Postgres client tools (e.g. `brew install libpq`)\n" +
      "   or rely on Neon's point-in-time restore.",
    e,
  );
  process.exit(1);
}
