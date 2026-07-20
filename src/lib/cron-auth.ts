/**
 * Shared CRON_SECRET guard for the /api/cron/* routes (refresh-prices,
 * check-alerts, weekly-digest). Vercel Cron sends
 *   Authorization: Bearer <CRON_SECRET>
 * when that env var is set; anything else is rejected. Header-only on purpose:
 * a ?key= fallback would land the secret in access logs and browser history.
 * Manual trigger: curl -H "Authorization: Bearer $CRON_SECRET".
 *
 * The routes are listed in middleware PUBLIC_PATHS (via the /api/cron prefix)
 * so the session auth gate doesn't redirect them — this check is their ONLY
 * auth, which is why it fails closed when CRON_SECRET is unset.
 */
import "server-only";
import { env } from "@/lib/env";

/** Pure comparison, unit-tested: exact Bearer match; fail closed on empty secret. */
export function isAuthorizedCronHeader(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

/** Guard used by the cron route handlers. */
export function cronAuthorized(req: Request): boolean {
  return isAuthorizedCronHeader(req.headers.get("authorization"), env.CRON_SECRET);
}
