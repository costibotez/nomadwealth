/**
 * Owner two-factor helpers: backup (recovery) codes + the server-side second
 * factor check used at login.
 *
 * Backup codes are single-use recovery codes shown ONCE at enrollment. We store
 * only their PBKDF2 hashes (reusing the exact password hasher in lib/owner.ts —
 * same format, timing-safe verify) and remove each hash from the array as it is
 * consumed. Everything lives only in the buyer's own Neon DB (see CLAUDE.md).
 */
import "server-only";
import { hashPassword, verifyPassword } from "@/lib/owner";
import { verifyTOTP } from "@/lib/totp";
import type { Owner } from "@/db/schema";

const BACKUP_CODE_COUNT = 10;
// Human-friendly alphabet: no 0/O/1/I/L to avoid transcription errors.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** One "XXXX-XXXX" recovery code drawn from a readable alphabet. */
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    if (i === 4) s += "-";
    s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return s;
}

/** Fresh set of plaintext backup codes (shown to the owner exactly once). */
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, randomCode);
}

/** Hash a batch of plaintext backup codes for storage (order is irrelevant). */
export function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => hashPassword(normalizeBackupCode(c))));
}

/** Normalize user input so "abcd efgh" / "ABCD-EFGH" all match the stored form. */
export function normalizeBackupCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, "");
}

/**
 * Try a plaintext backup code against the stored hashes. On a match returns the
 * remaining hashes (with the used one removed) so the caller can persist the
 * consumption. Checks every hash (no early return) to avoid leaking, via
 * timing, which/whether a code matched.
 */
export async function consumeBackupCode(
  code: string,
  hashes: string[] | null | undefined,
): Promise<{ ok: boolean; remaining: string[] }> {
  const list = hashes ?? [];
  const normalized = normalizeBackupCode(code);
  let matchIndex = -1;
  for (let i = 0; i < list.length; i++) {
    if (await verifyPassword(normalized, list[i])) matchIndex = i;
  }
  if (matchIndex === -1) return { ok: false, remaining: list };
  const remaining = list.filter((_, i) => i !== matchIndex);
  return { ok: true, remaining };
}

/**
 * Verify a second factor for an owner whose 2FA is enabled: a live TOTP code, or
 * a single-use backup code. Backup-code consumption is signalled via
 * `consumedBackupCodes` (the new remaining array) so the caller can persist it.
 */
export async function verifySecondFactor(
  owner: Pick<Owner, "totpSecret" | "backupCodes">,
  code: string,
): Promise<{ ok: boolean; consumedBackupCodes?: string[] }> {
  const submitted = code.trim();
  if (!submitted) return { ok: false };

  if (owner.totpSecret) {
    const totpOk = await verifyTOTP(owner.totpSecret, submitted);
    if (totpOk) return { ok: true };
  }

  const backup = await consumeBackupCode(submitted, owner.backupCodes);
  if (backup.ok) return { ok: true, consumedBackupCodes: backup.remaining };

  return { ok: false };
}
