/**
 * Single-password session gate.
 *
 * Implementation uses an HMAC-SHA256 signed token via the Web Crypto API so the
 * exact same code runs in Edge middleware AND Node route handlers. The session
 * payload is just an expiry timestamp — there is one user, so there is nothing
 * else to encode.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SEAM: swapping in multi-device auth later (e.g. NextAuth email magic link).
 *   - Replace `verifySession` usage in `middleware.ts` with NextAuth's
 *     `auth()` middleware.
 *   - Replace the /api/auth/login route with a NextAuth provider.
 *   - The cookie name + payload shape are intentionally minimal so the rest of
 *     the app (which only ever asks "is there a valid session?") is unaffected.
 * ───────────────────────────────────────────────────────────────────────────
 */

export const SESSION_COOKIE = "pid_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64url(new Uint8Array(sig));
}

/** Constant-time string comparison (works on edge + node). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Compare lengths via the loop too so we don't early-exit on length.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export interface SessionPayload {
  exp: number; // unix seconds
  /**
   * Session generation, mirroring owner.session_version (0 = env-password
   * fallback / legacy token). Bumping the column invalidates every issued
   * token at the Node layer — see `requireSession` in lib/auth-actions.ts.
   * Edge middleware only checks signature + expiry (no DB at the edge).
   */
  ver?: number;
}

export async function signSession(secret: string, ver = 0): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    ver,
  };
  const body = base64url(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  /** When provided, the token's `ver` claim must match (missing claim = 0). */
  expectedVer?: number,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, body);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const json = new TextDecoder().decode(base64urlToBytes(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (expectedVer !== undefined && (payload.ver ?? 0) !== expectedVer) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
