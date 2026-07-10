/**
 * TOTP (RFC 6238) + HOTP (RFC 4226) — dependency-free, Web Crypto only.
 *
 * Implemented over the Web Crypto API (HMAC-SHA1) so the exact same code runs
 * in Node route handlers and edge, with no native/npm TOTP dependency. Used for
 * the optional owner two-factor login. The secret is a base32 string; it (and
 * the derived codes) live only in the buyer's own DB — see CLAUDE.md.
 *
 * SHA-1 here is the RFC-6238-mandated MAC for interop with every authenticator
 * app (Google Authenticator, 1Password, Aegis, …) — it is not used as a
 * password hash and carries no collision-resistance requirement.
 */

const DEFAULT_STEP = 30; // seconds per code (RFC 6238 default)
const DEFAULT_DIGITS = 6;

// RFC 4648 base32 alphabet (no padding in the secrets we emit).
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode raw bytes to an (unpadded) RFC 4648 base32 string. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

/** Decode a base32 string (case-insensitive, ignores spaces/padding). */
export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/**
 * A fresh random base32 secret. 20 bytes = 160 bits, the RFC 4226 recommended
 * key length, and produces a 32-char base32 string.
 */
export function generateSecret(bytes = 20): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return base32Encode(buf);
}

/** Build the otpauth:// URI an authenticator app scans from a QR code. */
export function otpauthURL(
  secret: string,
  account: string,
  issuer = "NomadWealth",
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DEFAULT_DIGITS),
    period: String(DEFAULT_STEP),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

async function hmacSha1(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg as BufferSource);
  return new Uint8Array(sig);
}

/** Big-endian 8-byte counter buffer. */
function counterBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  // JS bitwise ops are 32-bit; split into high/low words to cover 2^53.
  let hi = Math.floor(counter / 0x100000000);
  let lo = counter >>> 0;
  for (let i = 7; i >= 4; i--) {
    buf[i] = lo & 0xff;
    lo = Math.floor(lo / 256);
  }
  for (let i = 3; i >= 0; i--) {
    buf[i] = hi & 0xff;
    hi = Math.floor(hi / 256);
  }
  return buf;
}

/** HOTP (RFC 4226): counter-based one-time password from raw key bytes. */
export async function hotp(
  key: Uint8Array,
  counter: number,
  digits = DEFAULT_DIGITS,
): Promise<string> {
  const digest = await hmacSha1(key, counterBytes(counter));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

/**
 * The TOTP code for a base32 secret at a given time.
 * @param nowMs epoch milliseconds (defaults to now). Exposed for testing.
 */
export async function generateTOTP(
  secret: string,
  nowMs: number = Date.now(),
  step = DEFAULT_STEP,
  digits = DEFAULT_DIGITS,
): Promise<string> {
  const counter = Math.floor(nowMs / 1000 / step);
  return hotp(base32Decode(secret), counter, digits);
}

/** Constant-time compare of two equal-length ASCII digit strings. */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a submitted TOTP code against the secret, accepting ±`window` steps to
 * tolerate clock skew (window=1 → the previous, current, and next 30s window).
 */
export async function verifyTOTP(
  secret: string,
  code: string,
  window = 1,
  nowMs: number = Date.now(),
  step = DEFAULT_STEP,
  digits = DEFAULT_DIGITS,
): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d+$/.test(trimmed) || trimmed.length !== digits) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(nowMs / 1000 / step);
  for (let w = -window; w <= window; w++) {
    const c = counter + w;
    if (c < 0) continue;
    const candidate = await hotp(key, c, digits);
    if (timingSafeEqualStr(candidate, trimmed)) return true;
  }
  return false;
}
