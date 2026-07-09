/**
 * Server-Action auth guard.
 *
 * Middleware gates page navigation, but Server Actions are POSTs that can be
 * aimed at ANY route — including the public /share/[token] pages. So mutations
 * must independently confirm a valid owner session before touching data. Every
 * mutating action in app/actions.ts calls `requireSession()` first.
 */
import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Throws if there is no valid owner session. Safe to call inside actions. */
export async function requireSession(): Promise<void> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Not authorized");
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, secret);
  if (!session) throw new Error("Not authorized");
}
