/**
 * VENDOR-side license signing (Ed25519). Runs only where the private key is
 * configured — i.e. the vendor's own deployment. Buyer self-host installs never
 * set NW_LICENSE_PRIVATE_KEY, so this is inert for them. The matching PUBLIC key
 * is embedded in src/lib/license.ts and verifies keys offline.
 *
 * Key format matches src/lib/license.ts: `NW1.<payloadB64url>.<sigB64url>`,
 * payload = JSON { tier, sub?, updatesUntil? }.
 */
import "server-only";

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

/** True when this deployment can sign keys (vendor side). */
export function canSignLicenses(): boolean {
  return Boolean(process.env.NW_LICENSE_PRIVATE_KEY);
}

let keyPromise: Promise<CryptoKey> | null = null;
function getPrivateKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const pkcs8 = process.env.NW_LICENSE_PRIVATE_KEY;
    if (!pkcs8) throw new Error("NW_LICENSE_PRIVATE_KEY is not set");
    keyPromise = crypto.subtle.importKey(
      "pkcs8",
      fromB64url(pkcs8) as BufferSource,
      { name: "Ed25519" },
      false,
      ["sign"],
    );
  }
  return keyPromise;
}

export interface SignArgs {
  tier: "self-host" | "updates";
  sub?: string; // customer identifier (e.g. email)
  updatesUntil?: string; // ISO date (YYYY-MM-DD)
}

export async function signLicenseKey({
  tier,
  sub,
  updatesUntil,
}: SignArgs): Promise<string> {
  const payload: Record<string, string> = { tier };
  if (sub) payload.sub = sub;
  if (updatesUntil) payload.updatesUntil = updatesUntil;

  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    { name: "Ed25519" },
    await getPrivateKey(),
    enc.encode(body) as BufferSource,
  );
  return `NW1.${body}.${b64url(new Uint8Array(sig))}`;
}
