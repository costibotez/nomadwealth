/**
 * Owner account: password hashing + lookup.
 *
 * Passwords are hashed with PBKDF2 over the Web Crypto API (SHA-256, 210k
 * iterations) — no native bcrypt dependency, so the exact same code runs in
 * Node route handlers and (if ever needed) edge. Format:
 *   pbkdf2$<iterations>$<saltB64url>$<hashB64url>
 *
 * Auth precedence (see /api/auth/login): the owner row (set in the setup
 * wizard) wins; if there is no owner row we fall back to the env
 * DASHBOARD_PASSWORD, preserving the original CLI/advanced install path.
 */
import "server-only";
import { db } from "@/db";
import { owner } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const ITERATIONS = 210_000;
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = fromB64url(parts[2]);
  const expected = fromB64url(parts[3]);
  const actual = await pbkdf2(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/** The single owner row, or null if setup has not created one yet. */
export async function getOwner() {
  const rows = await db.select().from(owner).limit(1);
  return rows[0] ?? null;
}

/** Create (or replace) the single owner account during setup. */
export async function setOwner(password: string, email?: string) {
  const passwordHash = await hashPassword(password);
  await db.delete(owner); // single-tenant: only ever one owner row
  await db.insert(owner).values({ passwordHash, email: email ?? null });
}

/**
 * Rotate the owner password AFTER setup (Settings → Account password). Unlike
 * setOwner this preserves the existing row — email and any 2FA config (TOTP
 * secret, backup codes) survive a password change. If the install was still on
 * the env DASHBOARD_PASSWORD fallback (no owner row), this creates the row,
 * which makes the env password inert (login precedence) and unlocks app-managed
 * 2FA. Returns whether a new owner row was created.
 */
export async function setOwnerPassword(
  password: string,
): Promise<{ created: boolean }> {
  const passwordHash = await hashPassword(password);
  const existing = await getOwner();
  if (existing) {
    await db.update(owner).set({ passwordHash }).where(eq(owner.id, existing.id));
    return { created: false };
  }
  await db.insert(owner).values({ passwordHash, email: null });
  return { created: true };
}

/**
 * Invalidate every outstanding session token (password change, 2FA change,
 * "log out all devices") by bumping the owner's session generation. Returns
 * the new version so the caller can re-issue a fresh cookie for the current
 * device. No-ops (returns 0) when the install is still on the env-password
 * fallback with no owner row.
 */
export async function bumpSessionVersion(): Promise<number> {
  const existing = await getOwner();
  if (!existing) return 0;
  const [row] = await db
    .update(owner)
    .set({ sessionVersion: sql`${owner.sessionVersion} + 1` })
    .where(eq(owner.id, existing.id))
    .returning({ sessionVersion: owner.sessionVersion });
  return row.sessionVersion;
}
