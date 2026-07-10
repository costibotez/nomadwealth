/**
 * Email delivery for price alerts via Resend's REST API (no SDK — same pattern
 * as lib/stripe-webhook.ts). Uses the buyer's own RESEND_API_KEY + from-address;
 * returns false when email isn't configured so callers can degrade gracefully.
 */
import "server-only";
import { renderEmail, escapeHtml } from "@/lib/email-template";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app";

export function emailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      (process.env.ALERT_FROM_EMAIL || process.env.LICENSE_FROM_EMAIL),
  );
}

export async function sendAlertEmail(
  to: string,
  subject: string,
  lines: string[],
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL ?? process.env.LICENSE_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const bodyHtml = lines
    .map((l) => `<p style="margin:0 0 12px 0;">${escapeHtml(l)}</p>`)
    .join("");
  const html = renderEmail({
    preheader: subject,
    heading: "Price alert",
    bodyHtml,
    cta: { label: "Open watchlist", url: `${SITE_URL}/dashboard/watchlist` },
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return res.ok;
}
