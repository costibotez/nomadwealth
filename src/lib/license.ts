/**
 * License activation — OFFLINE-first, privacy-preserving.
 *
 * A license key is `NW1.<payloadB64url>.<sigB64url>`, where the payload is a JSON
 * blob { tier, sub?, updatesUntil? } signed by the vendor's Ed25519 PRIVATE key.
 * The app verifies it against the embedded PUBLIC key (below) with Web Crypto —
 * no network call, so no data (opaque key or otherwise) ever leaves the install.
 *
 * Optional remote check: if LICENSE_API_URL is set, we additionally POST just
 * the opaque { key } for revocation checks — never any financial data. This is
 * off by default (the product's whole pitch is "we can't see your data").
 *
 * Graceful degradation: an empty key, or a "NW-TRIAL-*" key, activates a
 * functional TRIAL tier so a buyer is never hard-blocked mid-onboarding.
 *
 * Vendor signs keys with scripts/sign-license.ts (private key kept off-repo).
 */
import "server-only";

// Vendor Ed25519 public key (raw, base64url). Safe to ship — it can only verify.
// Matching private key: NW_LICENSE_PRIVATE_KEY (kept off-repo; used to sign keys).
const PUBLIC_KEY_B64URL = "NkFDJ93uQhhcce_Tpx7YgD4MFu2fzNNkUscXAyZWugI";

export type LicenseTier = "self-host" | "updates" | "trial";

export interface LicenseResult {
  valid: boolean;
  tier: LicenseTier;
  updatesUntil?: string;
  error?: string;
}

const enc = new TextEncoder();

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let publicKeyPromise: Promise<CryptoKey> | null = null;
function getPublicKey(): Promise<CryptoKey> {
  if (!publicKeyPromise) {
    publicKeyPromise = crypto.subtle.importKey(
      "raw",
      fromB64url(PUBLIC_KEY_B64URL) as BufferSource,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
  }
  return publicKeyPromise;
}

export async function verifyLicenseKey(rawKey: string): Promise<LicenseResult> {
  const key = rawKey.trim();

  // Graceful trial: empty or explicit trial key.
  if (key === "" || key.toUpperCase().startsWith("NW-TRIAL")) {
    return { valid: true, tier: "trial" };
  }

  const parts = key.split(".");
  if (parts.length !== 3 || parts[0] !== "NW1") {
    return { valid: false, tier: "trial", error: "Unrecognized key format." };
  }

  const [, body, sig] = parts;
  try {
    const ok = await crypto.subtle.verify(
      { name: "Ed25519" },
      await getPublicKey(),
      fromB64url(sig) as BufferSource,
      enc.encode(body) as BufferSource,
    );
    if (!ok) {
      return { valid: false, tier: "trial", error: "Invalid license signature." };
    }
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as {
      tier?: string;
      updatesUntil?: string;
    };
    const tier: LicenseTier =
      payload.tier === "updates" ? "updates" : "self-host";
    return { valid: true, tier, updatesUntil: payload.updatesUntil };
  } catch (err) {
    return {
      valid: false,
      tier: "trial",
      error: err instanceof Error ? err.message : "Verification failed.",
    };
  }
}

/**
 * Optional opaque remote revocation check. Sends ONLY the key. No-op (returns
 * the offline result) unless LICENSE_API_URL is configured.
 */
export async function remoteKeyCheck(
  key: string,
  offline: LicenseResult,
): Promise<LicenseResult> {
  const url = process.env.LICENSE_API_URL;
  if (!url || !offline.valid) return offline;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }), // opaque key only — never financial data
    });
    if (!res.ok) return offline;
    const data = (await res.json()) as { revoked?: boolean };
    if (data.revoked) {
      return { valid: false, tier: "trial", error: "License has been revoked." };
    }
    return offline;
  } catch {
    // Network failure must not brick a self-hosted install — trust offline.
    return offline;
  }
}
