/**
 * Reusable branded HTML email template for NomadWealth transactional mail.
 *
 * Emails render in wildly inconsistent clients (Gmail, Outlook desktop, Apple
 * Mail, mobile webviews) that strip `<style>`/external CSS, ignore flexbox, and
 * mangle modern layout. So this template is **table-based with inline CSS only**
 * and uses **no external images** (no broken-image icons, no tracking pixels).
 *
 * The design mirrors the NomadWealth surfaces: a light content card on a neutral
 * background, the brand accent (`#ff7a18`) on the header bar / CTA / links, and
 * dark ink text. The "NomadWealth" wordmark is rendered as styled text — an
 * email cannot import the React `<Wordmark>` component or its PNGs.
 *
 * Privacy invariant: this is sent from the vendor deployment only and never
 * contains buyer financial data. The footer restates that guarantee.
 */
import "server-only";

/** Brand accent — matches `--accent` in the app design tokens. */
const ACCENT = "#ff7a18";
/** Ink used on the accent bar/button, matches on-accent ink token `#0f1115`. */
const ON_ACCENT = "#0f1115";
/** Primary body ink. */
const INK = "#12151b";
/** Muted/secondary text. */
const MUTED = "#5a6472";
/** Neutral page background behind the card. */
const PAGE_BG = "#f1f3f5";
/** Card surface. */
const CARD_BG = "#ffffff";
/** Hairline border. */
const BORDER = "#e2e8f0";

/**
 * Web-font-safe stack. Geist is named first (matches the app UI) but every
 * client falls back to system fonts since emails can't reliably load web fonts.
 */
const FONT_STACK =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Default site URL, overridable so the same helper works across deployments. */
const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app";

/** Minimal HTML-escape for values interpolated into attributes/text. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailCta {
  /** Button label. */
  label: string;
  /** Destination URL (absolute). */
  url: string;
}

export interface RenderEmailArgs {
  /**
   * Hidden inbox-preview text shown after the subject in most clients. Keep it
   * short and specific; it does not appear in the visible body.
   */
  preheader: string;
  /** Large heading at the top of the card. Plain text (escaped). */
  heading: string;
  /**
   * Trusted HTML for the message body (paragraphs, a monospaced key block,
   * lists, etc.). Callers are responsible for escaping any untrusted values
   * they interpolate here.
   */
  bodyHtml: string;
  /** Optional bulletproof CTA button. */
  cta?: EmailCta;
  /**
   * Optional extra note rendered above the standard privacy footer (trusted
   * HTML). Use for small print like "Includes updates until …".
   */
  footerNote?: string;
  /** Override the footer/site link. Defaults to `NEXT_PUBLIC_SITE_URL`. */
  siteUrl?: string;
}

/**
 * Renders a complete, self-contained branded HTML email. Returns a full
 * document string ready to hand to Resend's `html` field.
 */
export function renderEmail({
  preheader,
  heading,
  bodyHtml,
  cta,
  footerNote,
  siteUrl,
}: RenderEmailArgs): string {
  const site = siteUrl ?? DEFAULT_SITE_URL;
  const siteLabel = site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const ctaHtml = cta
    ? `
              <tr>
                <td align="left" style="padding:8px 0 4px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="${ACCENT}" style="border-radius:10px;">
                        <a href="${escapeHtml(cta.url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1;color:${ON_ACCENT};text-decoration:none;border-radius:10px;">${escapeHtml(
                          cta.label,
                        )}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
    : "";

  const footerNoteHtml = footerNote
    ? `
              <tr>
                <td style="padding:0 0 14px 0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${MUTED};">
                  ${footerNote}
                </td>
              </tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
  <!-- preheader: hidden inbox-preview text -->
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${escapeHtml(
    preheader,
  )}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <!-- accent header bar / wordmark -->
          <tr>
            <td style="background-color:${ACCENT};padding:20px 32px;">
              <span style="font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${ON_ACCENT};text-decoration:none;">Nomad<span style="font-weight:800;">Wealth</span></span>
            </td>
          </tr>
          <!-- body -->
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 12px 0;font-family:${FONT_STACK};font-size:22px;font-weight:700;line-height:1.25;color:${INK};">
                    ${escapeHtml(heading)}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${INK};">
                    ${bodyHtml}
                  </td>
                </tr>
                ${ctaHtml}
              </table>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding:8px 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:16px 0 0 0;border-top:1px solid ${BORDER};"></td>
                </tr>
                ${footerNoteHtml}
                <tr>
                  <td style="padding:0 0 8px 0;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${MUTED};">
                    Your data stays on your own infrastructure &mdash; we can't see it.
                  </td>
                </tr>
                <tr>
                  <td style="font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${MUTED};">
                    <a href="${escapeHtml(
                      site,
                    )}" target="_blank" style="color:${ACCENT};text-decoration:none;">${escapeHtml(
                      siteLabel,
                    )}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
