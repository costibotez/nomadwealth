/**
 * Helpers shared by the /api/setup/* and first-run routes.
 */
import "server-only";
import { getSetupState } from "@/lib/setup-state";

/**
 * Resolve the database URL to operate on. On Vercel the buyer's DATABASE_URL is
 * injected (Neon integration), so that is authoritative. A body-provided URL is
 * only honored when no env URL exists (local dev / pre-integration), never on a
 * deployed instance — this avoids letting an unconfigured public instance be
 * pointed at an arbitrary database.
 */
export function resolveDatabaseUrl(bodyUrl?: string): string | null {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) return envUrl;
  if (bodyUrl && bodyUrl.trim().length > 0) return bodyUrl.trim();
  return null;
}

/** True while the install is still unconfigured (setup routes are allowed). */
export async function isUnconfigured(): Promise<boolean> {
  const state = await getSetupState();
  return !state.configured;
}

/** Mask a connection string for display (keep host, hide credentials). */
export function maskDatabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//••••@${u.host}${u.pathname}`;
  } catch {
    return "configured";
  }
}
