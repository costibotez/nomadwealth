/**
 * OPT-IN, opaque activation ping (default OFF; gated by app_config.share_activation).
 *
 * When the owner has opted in, the install lets the vendor know a license was
 * activated — sending ONLY a SHA-256 hash of the key + the tier. The raw key,
 * and any financial/portfolio data, never leave the install. Fire-and-forget:
 * a failed ping must never affect activation. Honors the "telemetry is opt-in
 * and scrubbed of all financial data" invariant (see CLAUDE.md).
 */
import "server-only";

// Vendor admin endpoint. Baked in so opted-in buyer installs reach the vendor;
// overridable per-deployment via NW_ACTIVATION_PING_URL.
const DEFAULT_URL = "https://admin.nomadwealth.app/api/activations";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function pingActivation(
  key: string,
  tier: string,
  updatesUntil?: string | null,
): Promise<void> {
  const url = process.env.NW_ACTIVATION_PING_URL ?? DEFAULT_URL;
  try {
    const keyHash = await sha256Hex(key);
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        keyHash,
        tier,
        activatedAt: new Date().toISOString(),
        ...(updatesUntil ? { updatesUntil } : {}),
      }),
      // Don't hang activation on a slow vendor endpoint.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* opt-in telemetry must never block or surface errors */
  }
}
