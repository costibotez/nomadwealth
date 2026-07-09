/**
 * Neon serverless Postgres client (Drizzle).
 * Server-only — never import from a client component.
 *
 * The client is created lazily on first use so that simply importing this module
 * (e.g. during Next.js build-time page-data collection) does not require a live
 * DATABASE_URL. All pages that read data are `dynamic = "force-dynamic"`, so no
 * query runs at build time.
 */
import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(neon(env.DATABASE_URL), { schema });
  }
  return _db;
}

// Proxy so existing `db.select()...` call-sites keep working unchanged.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof typeof real];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
