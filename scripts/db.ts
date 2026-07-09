/**
 * DB client for local scripts (importer, seeders, backup).
 * Uses relative imports (no "@/..." alias) and reads DATABASE_URL via dotenv so
 * it runs under `tsx` without Next.js. Never bundled into the app.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Create a .env(.local) with your Neon connection string.",
  );
}

export const db = drizzle(neon(url), { schema });
export { schema };
