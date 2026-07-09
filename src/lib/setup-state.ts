/**
 * Install setup state — the source of truth for the first-run guard.
 *
 * An install is "configured" once the setup wizard has written app_config.
 * setup_completed_at AND an owner row exists. Until then every route redirects
 * to /setup; once configured, /setup redirects to the dashboard.
 *
 * The check is resilient: a brand-new empty Neon DB has no tables yet, so any
 * query throws — we treat that (and a missing DATABASE_URL) as "not configured"
 * rather than crashing, so the wizard can run.
 */
import "server-only";
import { neon } from "@neondatabase/serverless";

export interface SetupState {
  configured: boolean;
  hasDatabaseUrl: boolean;
  setupCompletedAt: string | null;
}

// Small in-process cache: once configured, the state never reverts, so warm
// serverless instances skip the round-trip. Unconfigured state is re-checked
// every call (cheap, and setup progresses quickly).
let cached: SetupState | null = null;

export async function getSetupState(): Promise<SetupState> {
  if (cached?.configured) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    return { configured: false, hasDatabaseUrl: false, setupCompletedAt: null };
  }

  try {
    const sql = neon(url);
    const rows = (await sql(
      `SELECT ac.setup_completed_at AS setup_completed_at,
              (SELECT count(*) FROM "owner") AS owner_count
         FROM "app_config" ac
        WHERE ac.id = 1`,
    )) as { setup_completed_at: string | null; owner_count: number }[];

    const row = rows[0];
    const configured = Boolean(row?.setup_completed_at) && Number(row?.owner_count) > 0;
    const state: SetupState = {
      configured,
      hasDatabaseUrl: true,
      setupCompletedAt: row?.setup_completed_at ?? null,
    };
    if (configured) cached = state;
    return state;
  } catch {
    // Tables don't exist yet (fresh DB) → unconfigured, run the wizard.
    return { configured: false, hasDatabaseUrl: true, setupCompletedAt: null };
  }
}

/** Invalidate the cache (call right after the wizard completes). */
export function clearSetupStateCache() {
  cached = null;
}
