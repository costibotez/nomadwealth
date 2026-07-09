/**
 * Runtime migrator — applies the embedded SQL migrations over the Neon
 * serverless HTTP driver, from inside an API route.
 *
 * The setup wizard calls this instead of shelling out to drizzle-kit (a
 * dev-time native binary that does not run in serverless/restricted envs — see
 * the build brief). Applied migrations are tracked in `__nw_migrations`, so it
 * is safe to re-run: already-applied tags are skipped, and "object already
 * exists" errors (e.g. when an advanced user ran `db:push` first) are tolerated
 * so a partially-provisioned DB still converges.
 */
import "server-only";
import { neon } from "@neondatabase/serverless";
import { MIGRATIONS, SCHEMA_VERSION } from "@/db/migrations.generated";

// Postgres SQLSTATEs meaning "this object already exists" — safe to ignore when
// converging an already-partially-migrated database.
const ALREADY_EXISTS = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object (types, constraints)
  "42P06", // duplicate_schema
  "42701", // duplicate_column
  "42P16", // invalid_table_definition (re-adding)
  "23505", // unique_violation (re-seeding singleton rows)
]);

function sqlstate(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code);
  }
  return undefined;
}

export interface MigrateResult {
  ok: boolean;
  schemaVersion: string;
  applied: string[];
  error?: string;
}

export async function runMigrations(databaseUrl: string): Promise<MigrateResult> {
  const sql = neon(databaseUrl);
  const applied: string[] = [];

  try {
    await sql(
      `CREATE TABLE IF NOT EXISTS "__nw_migrations" (
        "tag" text PRIMARY KEY,
        "applied_at" timestamp with time zone DEFAULT now() NOT NULL
      )`,
    );

    const doneRows = (await sql(
      `SELECT tag FROM "__nw_migrations"`,
    )) as { tag: string }[];
    const done = new Set(doneRows.map((r) => r.tag));

    for (const migration of MIGRATIONS) {
      if (done.has(migration.tag)) continue;
      for (const statement of migration.statements) {
        try {
          await sql(statement);
        } catch (err) {
          const code = sqlstate(err);
          if (code && ALREADY_EXISTS.has(code)) continue; // tolerate
          throw err;
        }
      }
      await sql(`INSERT INTO "__nw_migrations" (tag) VALUES ($1)`, [
        migration.tag,
      ]);
      applied.push(migration.tag);
    }

    return { ok: true, schemaVersion: SCHEMA_VERSION, applied };
  } catch (err) {
    return {
      ok: false,
      schemaVersion: SCHEMA_VERSION,
      applied,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Quick connectivity check used by /api/setup/verify-db. */
export async function verifyConnection(
  databaseUrl: string,
): Promise<{ connected: boolean; error?: string }> {
  try {
    const sql = neon(databaseUrl);
    await sql(`SELECT 1`);
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
