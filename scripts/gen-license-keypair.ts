/**
 * VENDOR-ONLY: generate a fresh Ed25519 license keypair.
 *
 * Prints the PUBLIC key (raw base64url) to embed in `src/lib/license.ts` as
 * `PUBLIC_KEY_B64URL`, and the PRIVATE key (pkcs8 base64url) to set as the
 * `NW_LICENSE_PRIVATE_KEY` env var used by `scripts/sign-license.ts`. The public
 * key only verifies (safe to ship in the client bundle); the private key signs
 * and must be kept secret.
 *
 * The private key is also written to `.nomadwealth-license-key.local`
 * (gitignored) so it isn't lost between runs.
 *
 *   pnpm tsx scripts/gen-license-keypair.ts
 *
 * ⚠️  Generating a NEW keypair invalidates every previously-signed license key.
 *     Only run this for a first-time setup or a deliberate key rotation.
 */
import { webcrypto as c } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";

function b64url(buf: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buf))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const OUT_FILE = ".nomadwealth-license-key.local";

if (existsSync(OUT_FILE)) {
  console.error(
    `Refusing to overwrite ${OUT_FILE} — a private key already exists there.\n` +
      `Delete it first if you really intend to rotate keys (this invalidates all issued licenses).`,
  );
  process.exit(1);
}

const kp = (await c.subtle.generateKey({ name: "Ed25519" }, true, [
  "sign",
  "verify",
])) as CryptoKeyPair;

const pub = b64url(await c.subtle.exportKey("raw", kp.publicKey));
const priv = b64url(await c.subtle.exportKey("pkcs8", kp.privateKey));

writeFileSync(OUT_FILE, `NW_LICENSE_PRIVATE_KEY=${priv}\n`, { mode: 0o600 });

console.log(`
Generated a new Ed25519 license keypair.

1) Embed this PUBLIC key in src/lib/license.ts:

   const PUBLIC_KEY_B64URL = "${pub}";

2) Set this PRIVATE key wherever you sign/deliver keys (also saved to ${OUT_FILE}):

   NW_LICENSE_PRIVATE_KEY=${priv}

Then issue a license with:
   NW_LICENSE_PRIVATE_KEY=... pnpm tsx scripts/sign-license.ts self-host you@email 2027-07-06

⚠️  This invalidates any keys signed with a previous keypair.
`);
