/**
 * Server-Action auth guard.
 *
 * Middleware gates page navigation, but Server Actions are POSTs that can be
 * aimed at ANY route — including the public /share/[token] pages. So mutations
 * must independently confirm a valid owner session before touching data. Every
 * mutating action in app/actions.ts calls `requireSession()` first.
 *
 * Beyond signature + expiry, the token's `ver` claim must match the owner
 * row's session_version — bumping that column (password change, 2FA change,
 * "log out all devices") revokes every outstanding token. Edge middleware
 * cannot afford a DB read per request, so revocation is enforced here and in
 * the dashboard layout (Node), not at the edge.
 */
import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getOwner } from "@/lib/owner";

/** The session generation new tokens must carry (0 = env-password fallback). */
export async function expectedSessionVersion(): Promise<number> {
  const owner = await getOwner().catch(() => null);
  return owner?.sessionVersion ?? 0;
}

/** True when the request carries a valid, non-revoked owner session. */
export async function hasValidSession(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, secret, await expectedSessionVersion());
  return session !== null;
}

/** Throws if there is no valid owner session. Safe to call inside actions. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) throw new Error("Not authorized");
}
