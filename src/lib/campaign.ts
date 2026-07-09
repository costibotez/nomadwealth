/**
 * Pricing-campaign fetch — VENDOR MARKETING ONLY.
 *
 * The vendor's admin app (a separate deployment) exposes a small JSON endpoint
 * describing the currently-running pricing promo (Black Friday, launch week,
 * etc). The marketing site reads it *server-side* to render a promo banner,
 * struck-through discounted prices and a prefilled Stripe promo code.
 *
 * INVARIANT (see CLAUDE.md): buyer self-host installs must contact NOTHING
 * vendor-side. This is enforced by env-gating: the endpoint URL comes from the
 * server-only `CAMPAIGN_ENDPOINT` var, which is set ONLY on the vendor's own
 * marketing deployment. When it is unset (every buyer install), we never fetch
 * and behave exactly as before — no banner, undiscounted prices. The payload
 * carries no financial data, only promo metadata.
 */
import "server-only";

/** Shape returned by the admin campaign endpoint when a promo is live. */
export interface ActiveCampaign {
  /** Internal label, e.g. "Black Friday 2026". Used for a default banner/note. */
  label: string;
  /** Stripe promo code prefilled at checkout, e.g. "BF30". */
  promoCode: string;
  /** Whole-number discount percent applied to displayed prices, 1..99. */
  discountPct: number;
  /** Optional ready-made banner copy; falls back to a label-derived default. */
  bannerText: string | null;
  /** Optional ISO end date, for a default banner and possible urgency copy. */
  endsAt: string | null;
}

/** Raw endpoint contract (see admin app #8a). */
type CampaignResponse =
  | { active: false }
  | {
      active: true;
      label?: unknown;
      promoCode?: unknown;
      discountPct?: unknown;
      bannerText?: unknown;
      endsAt?: unknown;
    };

/**
 * Fetch the active pricing campaign, or `null`.
 *
 * Returns `null` — meaning "no campaign, render normal pricing" — on every
 * unhappy path: env unset, network/timeout error, non-OK status, malformed
 * JSON, `{active:false}`, or a payload missing the fields we need. Pricing must
 * never break because the vendor admin is slow or down.
 */
export async function getActiveCampaign(): Promise<ActiveCampaign | null> {
  const endpoint = process.env.CAMPAIGN_ENDPOINT;
  // Unset on every buyer install → never contact the vendor. This is the
  // load-bearing branch for the no-vendor-data invariant.
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(3000),
      // Cache across requests; refresh at most once a minute so a newly-started
      // or ended campaign appears without a redeploy.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as CampaignResponse;
    if (!data || data.active !== true) return null;

    const label = typeof data.label === "string" ? data.label.trim() : "";
    const promoCode =
      typeof data.promoCode === "string" ? data.promoCode.trim() : "";
    const discountPct =
      typeof data.discountPct === "number" ? Math.round(data.discountPct) : NaN;

    // A campaign without a usable code or a sane discount is not actionable.
    if (!promoCode) return null;
    if (!Number.isFinite(discountPct) || discountPct < 1 || discountPct > 99) {
      return null;
    }

    const bannerText =
      typeof data.bannerText === "string" && data.bannerText.trim()
        ? data.bannerText.trim()
        : null;
    const endsAt =
      typeof data.endsAt === "string" && data.endsAt.trim()
        ? data.endsAt.trim()
        : null;

    return {
      label: label || "Limited-time offer",
      promoCode,
      discountPct,
      bannerText,
      endsAt,
    };
  } catch {
    // Timeout, DNS, parse error — degrade silently to normal pricing.
    return null;
  }
}

/**
 * Apply a whole-percent discount to a price string like `"€149"` or
 * `"€12"`, preserving the currency symbol/prefix and any suffix. Rounds the
 * discounted amount to a whole unit. Returns `null` if no integer amount can
 * be parsed (so callers fall back to showing the original untouched).
 */
export function discountPriceString(
  price: string,
  discountPct: number,
): { original: string; discounted: string } | null {
  const match = price.match(/(\d[\d.,]*)/);
  if (!match) return null;
  const numeric = Number(match[1].replace(/[.,]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const discounted = Math.round(numeric * (1 - discountPct / 100));
  const discountedStr = price.replace(match[1], String(discounted));
  return { original: price, discounted: discountedStr };
}

/**
 * Append the Stripe `prefilled_promo_code` query param to a payment-link URL,
 * respecting any existing query string. Returns the input unchanged if it is
 * not a parseable absolute URL.
 */
export function withPrefilledPromo(href: string, promoCode: string): string {
  try {
    const url = new URL(href);
    url.searchParams.set("prefilled_promo_code", promoCode);
    return url.toString();
  } catch {
    return href;
  }
}

/** Default banner copy when the admin doesn't supply `bannerText`. */
export function defaultBannerText(c: ActiveCampaign): string {
  const ends = c.endsAt ? formatEndsAt(c.endsAt) : null;
  const base = `${c.label} — ${c.discountPct}% off with code ${c.promoCode}`;
  return ends ? `${base}, ends ${ends}` : base;
}

function formatEndsAt(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
