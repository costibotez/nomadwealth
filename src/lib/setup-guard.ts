/**
 * Helpers shared by the /api/setup/* and first-run routes.
 */
import "server-only";
import { timingSafeEqual } from "@/lib/auth";
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

/**
 * Optional first-run provisioning secret. Between deploy and the buyer
 * finishing the wizard, the setup routes are necessarily unauthenticated —
 * whoever reaches the URL first could claim the install. Setting SETUP_TOKEN
 * at deploy time closes that window: every first-run mutation then requires
 * the token in an `x-setup-token` header. Unset = no gate (setup should be
 * completed immediately on a URL that hasn't been shared).
 */
export function setupTokenRequired(): boolean {
  return Boolean(process.env.SETUP_TOKEN);
}

/** True when no token is configured, or the request carries the right one. */
export function verifySetupToken(req: Request): boolean {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return true;
  const got = req.headers.get("x-setup-token") ?? "";
  return timingSafeEqual(got, expected);
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
