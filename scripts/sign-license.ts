/**
 * VENDOR-ONLY: sign a NomadWealth license key.
 *
 * The Ed25519 private key is NEVER committed. Provide it as a base64url pkcs8
 * string via NW_LICENSE_PRIVATE_KEY. The matching public key is embedded in
 * src/lib/license.ts.
 *
 *   NW_LICENSE_PRIVATE_KEY=... pnpm tsx scripts/sign-license.ts self-host acme-corp 2027-07-06
 *
 * Args: <tier> [sub] [updatesUntil]
 */
import { webcrypto as c } from "node:crypto";

function b64url(b: Uint8Array | ArrayBuffer): string {
  return Buffer.from(b instanceof ArrayBuffer ? new Uint8Array(b) : b)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

const priv = process.env.NW_LICENSE_PRIVATE_KEY;
if (!priv) {
  console.error("Set NW_LICENSE_PRIVATE_KEY (base64url pkcs8).");
  process.exit(1);
}

const [tier = "self-host", sub, updatesUntil] = process.argv.slice(2);

const key = await c.subtle.importKey(
  "pkcs8",
  fromB64url(priv),
  { name: "Ed25519" },
  false,
  ["sign"],
);

const payload: Record<string, string> = { tier };
if (sub) payload.sub = sub;
if (updatesUntil) payload.updatesUntil = updatesUntil;

const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
const sig = await c.subtle.sign(
  { name: "Ed25519" },
  key,
  new TextEncoder().encode(body),
);
console.log(`NW1.${body}.${b64url(sig)}`);
