/**
 * Currency configuration.
 *
 * Canonical internal currency is EUR. Every monetary value is aggregated in EUR
 * server-side, then converted to the chosen display currency on the client.
 *
 * The static rates below are a LAST-RESORT fallback only — used when every live
 * FX source fails. When they are used the UI shows a "rates stale" badge.
 * Live rates come from /api/fx (Frankfurter, ECB-backed, keyless).
 */
export const CURRENCIES = ["EUR", "USD", "GBP", "RON"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** EUR -> X fallback rates (approximate, May 2025). */
export const FALLBACK_RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.15,
  GBP: 0.85,
  RON: 5.07,
};

export const CURRENCY_META: Record<
  Currency,
  { symbol: string; code: string; symbolAfter: boolean; locale: string }
> = {
  EUR: { symbol: "€", code: "EUR", symbolAfter: false, locale: "en-IE" },
  USD: { symbol: "$", code: "USD", symbolAfter: false, locale: "en-US" },
  GBP: { symbol: "£", code: "GBP", symbolAfter: false, locale: "en-GB" },
  RON: { symbol: "lei", code: "RON", symbolAfter: true, locale: "ro-RO" },
};
