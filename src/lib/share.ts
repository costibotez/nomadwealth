/**
 * Read-only share links.
 *
 * A share link grants VIEW-ONLY access to a chosen subset of dashboard tabs.
 * The raw token is a 256-bit random value that lives ONLY in the shared URL;
 * the database stores its SHA-256 hash (like a password). Validation never
 * issues a `pid_session` cookie, so share viewers structurally cannot reach the
 * session-gated Server Actions (see `requireSession` in lib/auth-actions.ts).
 *
 * Server-only. Uses the Web Crypto API so it works in any runtime.
 */
import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks, type ShareLink } from "@/db/schema";

const enc = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A fresh, URL-safe 256-bit token. Only ever returned once (at creation). */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** SHA-256 of the raw token, hex-encoded — what we persist and look up by. */
export async function hashToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface CreateShareLinkInput {
  label?: string;
  allowedTabs: string[]; // nav hrefs, e.g. ["/", "/holdings"]
  expiresAt?: Date | null;
}

/** Create a link and return BOTH the row and the one-time raw token. */
export async function createShareLink(
  input: CreateShareLinkInput,
): Promise<{ link: ShareLink; token: string }> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const [link] = await db
    .insert(shareLinks)
    .values({
      tokenHash,
      label: input.label?.trim() || "",
      allowedTabs: input.allowedTabs,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  return { link, token };
}

function isExpired(link: ShareLink): boolean {
  return link.expiresAt != null && link.expiresAt.getTime() <= Date.now();
}

/** A link is usable only if it is not soft-deleted, not revoked, not expired. */
export function isLive(link: ShareLink): boolean {
  return link.deletedAt == null && link.revokedAt == null && !isExpired(link);
}

/**
 * Resolve a raw token to a LIVE share link, or null. Touches `last_viewed_at`
 * as a side effect (fire-and-forget) so the owner can see usage.
 */
export async function getValidShareLink(
  rawToken: string,
  opts: { touch?: boolean } = {},
): Promise<ShareLink | null> {
  if (!rawToken) return null;
  const tokenHash = await hashToken(rawToken);
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.tokenHash, tokenHash), isNull(shareLinks.deletedAt)))
    .limit(1);
  if (!link || !isLive(link)) return null;
  if (opts.touch) {
    void db
      .update(shareLinks)
      .set({ lastViewedAt: new Date() })
      .where(eq(shareLinks.id, link.id))
      .catch(() => {});
  }
  return link;
}

/** True if `href` is one of the tabs this link is allowed to show. */
export function isTabAllowed(link: ShareLink, href: string): boolean {
  return link.allowedTabs.includes(href);
}

/** All non-deleted links, newest first (for the management UI). */
export async function listShareLinks(): Promise<ShareLink[]> {
  return db
    .select()
    .from(shareLinks)
    .where(isNull(shareLinks.deletedAt))
    .orderBy(desc(shareLinks.createdAt));
}

/** Revoke a link immediately. Idempotent. */
export async function revokeShareLink(id: number): Promise<void> {
  await db
    .update(shareLinks)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(shareLinks.id, id));
}

/** Permanently soft-delete a link (removes it from the management list). */
export async function deleteShareLink(id: number): Promise<void> {
  await db
    .update(shareLinks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(shareLinks.id, id));
}
