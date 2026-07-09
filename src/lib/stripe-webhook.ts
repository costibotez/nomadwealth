/**
 * Minimal Stripe webhook plumbing — signature verification + license email —
 * without pulling in the `stripe` SDK (keeps the buyer bundle lean and works in
 * any serverless runtime). Only the VENDOR deployment configures the secrets, so
 * this is inert on buyer self-host installs.
 */
import "server-only";
import { renderEmail, escapeHtml } from "./email-template";

const enc = new TextEncoder();

/* ------------------------------------------------- Stripe signature verify */
function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a `Stripe-Signature` header against the raw request body, the way
 * Stripe's SDK does: HMAC-SHA256 over `${timestamp}.${payload}` keyed by the
 * endpoint's signing secret, with a replay-window check.
 */
export async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${parts.t}.${rawBody}`),
  );
  const expected = hex(mac);

  // constant-time-ish compare
  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  }
  return diff === 0;
}

/* ---------------------------------------------- purchase → license tier map */
export interface TierMapping {
  tier: "self-host" | "updates";
  productLabel: string;
}

/**
 * Resolve the license tier from the checkout. Prefers explicit
 * `session.metadata.tier`; falls back to the amount so it works even if a
 * Payment Link has no metadata. Hosted purchases still receive a working
 * self-host key.
 */
export function resolveTier(
  metadataTier: string | undefined,
  amountTotal: number | null,
): TierMapping {
  const m = (metadataTier ?? "").toLowerCase();
  if (m === "updates") return { tier: "updates", productLabel: "License + Updates" };
  if (m === "self-host" || m === "hosted")
    return { tier: "self-host", productLabel: m === "hosted" ? "Hosted" : "Self-host License" };

  switch (amountTotal) {
    case 5900:
      return { tier: "updates", productLabel: "License + Updates" };
    case 1200:
    case 12000:
      return { tier: "self-host", productLabel: "Hosted" };
    case 14900:
    default:
      return { tier: "self-host", productLabel: "Self-host License" };
  }
}

/** One year from now as an ISO date (YYYY-MM-DD). */
export function oneYearFromNowISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/* --------------------------------------------------------- license email */
/**
 * Emails the license key via Resend's REST API (no SDK). Returns false if email
 * is not configured, so the caller can fall back to logging the key.
 */
export async function sendLicenseEmail(args: {
  to: string;
  key: string;
  productLabel: string;
  updatesUntil?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LICENSE_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const deployUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app";

  const bodyHtml = `
      <p style="margin:0 0 16px 0;">Thanks for buying the <strong>${escapeHtml(
        args.productLabel,
      )}</strong>. Here's your license key:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
        <tr>
          <td style="background-color:#f6f8fa;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;font-family:'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;color:#12151b;word-break:break-all;">${escapeHtml(
            args.key,
          )}</td>
        </tr>
      </table>
      <p style="margin:0 0 4px 0;">Deploy NomadWealth to your own Vercel + Neon, then paste this key into the setup wizard (or on the License page later).</p>`;

  const html = renderEmail({
    preheader: "Your NomadWealth license key is inside — activate in the setup wizard.",
    heading: "Your NomadWealth license",
    bodyHtml,
    cta: { label: "Deploy & activate", url: deployUrl },
    footerNote: args.updatesUntil
      ? `Includes updates until ${escapeHtml(args.updatesUntil)}.`
      : undefined,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: "Your NomadWealth license key",
      html,
    }),
  });
  return res.ok;
}
