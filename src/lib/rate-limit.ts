/**
 * Postgres-backed login rate limiting.
 *
 * Why Postgres: the app must run with only DATABASE_URL + SESSION_SECRET (see
 * CLAUDE.md) — no Upstash/KV. A single-owner install sees near-zero legitimate
 * login volume, so a row per limiter key is plenty.
 *
 * Policy:
 *  - Failures within a 15-minute window accumulate; older streaks reset.
 *  - After 5 consecutive failures the key locks: 2^(n-5) minutes, capped at 60.
 *  - Two keys are checked per attempt: the caller IP and a "global" key with a
 *    higher threshold (25), so a distributed guesser is still throttled.
 *  - Fails OPEN on DB errors — login itself needs the DB, and a transient
 *    outage must not lock the owner out permanently.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

const WINDOW_MS = 15 * 60 * 1000;
const IP_THRESHOLD = 5;
const GLOBAL_THRESHOLD = 25;
const MAX_LOCK_MINUTES = 60;

export function clientIpKey(req: Request): string {
  // Vercel sets x-forwarded-for; first hop is the client.
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

function lockMinutes(failures: number, threshold: number): number {
  if (failures < threshold) return 0;
  return Math.min(2 ** (failures - threshold), MAX_LOCK_MINUTES);
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Check whether a login attempt from this request may proceed. */
export async function checkLoginRateLimit(req: Request): Promise<RateLimitResult> {
  try {
    const keys = [clientIpKey(req), "global"];
    const now = Date.now();
    let retryAfter = 0;
    for (const key of keys) {
      const [row] = await db
        .select()
        .from(loginAttempts)
        .where(eq(loginAttempts.key, key));
      if (!row?.lockedUntil) continue;
      const until = row.lockedUntil.getTime();
      if (until > now) retryAfter = Math.max(retryAfter, Math.ceil((until - now) / 1000));
    }
    return retryAfter > 0
      ? { allowed: false, retryAfterSeconds: retryAfter }
      : { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Record a failed login (wrong password or wrong 2FA code). */
export async function recordLoginFailure(req: Request): Promise<void> {
  try {
    const now = new Date();
    for (const [key, threshold] of [
      [clientIpKey(req), IP_THRESHOLD],
      ["global", GLOBAL_THRESHOLD],
    ] as const) {
      const [row] = await db
        .select()
        .from(loginAttempts)
        .where(eq(loginAttempts.key, key));
      const streakAlive =
        row && now.getTime() - row.lastFailureAt.getTime() < WINDOW_MS;
      const failures = (streakAlive ? row.failures : 0) + 1;
      const minutes = lockMinutes(failures, threshold);
      const lockedUntil = minutes
        ? new Date(now.getTime() + minutes * 60_000)
        : null;
      await db
        .insert(loginAttempts)
        .values({ key, failures, lastFailureAt: now, lockedUntil })
        .onConflictDoUpdate({
          target: loginAttempts.key,
          set: { failures, lastFailureAt: now, lockedUntil },
        });
    }
  } catch {
    // Fail open — never let limiter bookkeeping break login handling.
  }
}

/**
 * Clear the caller's failure streak after a successful login. Only the IP key
 * is reset — the global counter must keep throttling a concurrent distributed
 * guesser even while the owner logs in successfully.
 */
export async function clearLoginFailures(req: Request): Promise<void> {
  try {
    await db
      .update(loginAttempts)
      .set({ failures: 0, lockedUntil: null })
      .where(eq(loginAttempts.key, clientIpKey(req)));
  } catch {
    // Fail open.
  }
}
