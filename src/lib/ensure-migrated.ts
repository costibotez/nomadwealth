/**
 * Keep an already-configured install's schema current.
 *
 * The setup wizard applies migrations via /api/setup/migrate, but that route
 * 403s once the install is configured — so nothing else ever applies a
 * migration added AFTER a buyer's initial setup. Result: a shipped feature whose
 * migration never ran surfaces at runtime as `column "…" does not exist` (this
 * bit the 2FA columns on the live install). This closes that gap: called from
 * Node-runtime server code that precedes DB reads (the dashboard layout), it
 * brings the connected DB up to the embedded SCHEMA_VERSION on the first request
 * after a deploy.
 *
 * Cost is negligible: runMigrations() checks __nw_migrations first and no-ops
 * when current, and we cache the success per server instance so subsequent
 * requests skip even that SELECT. Concurrent callers share one in-flight run.
 * Failures are never cached (and never thrown) — a transient error simply
 * retries on the next request rather than crashing the dashboard.
 */
import "server-only";
import { runMigrations } from "@/lib/migrate-runtime";
import { resolveDatabaseUrl } from "@/lib/setup-guard";
import { SCHEMA_VERSION } from "@/db/migrations.generated";

let doneFor: string | null = null;
let inflight: Promise<void> | null = null;

export async function ensureSchemaCurrent(): Promise<void> {
  if (doneFor === SCHEMA_VERSION) return;

  if (!inflight) {
    inflight = (async () => {
      const url = resolveDatabaseUrl();
      if (!url) return; // misconfigured — nothing to migrate against
      try {
        const res = await runMigrations(url);
        if (res.ok) {
          doneFor = SCHEMA_VERSION;
          if (res.applied.length > 0) {
            console.info(
              `[ensureSchemaCurrent] applied migrations: ${res.applied.join(", ")}`,
            );
          }
        } else {
          console.error(`[ensureSchemaCurrent] migration failed: ${res.error}`);
        }
      } catch (err) {
        console.error("[ensureSchemaCurrent] migration error:", err);
      } finally {
        inflight = null;
      }
    })();
  }

  await inflight;
}
