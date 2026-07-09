import { CURRENCY_META, type Currency } from "@/config/fx";

/**
 * Pure formatting helpers. All monetary inputs are amounts ALREADY converted to
 * the display currency (a plain number). Conversion from EUR happens in the
 * currency context; these functions only format.
 */

export interface MoneyOptions {
  compact?: boolean; // €191.2k style for tight cards
  decimals?: number; // override decimals
  signed?: boolean; // force +/- prefix
}

export function formatMoney(
  amount: number,
  currency: Currency,
  opts: MoneyOptions = {},
): string {
  const meta = CURRENCY_META[currency];
  const neg = amount < 0;
  const abs = Math.abs(amount);

  let body: string;
  if (opts.compact && abs >= 1000) {
    body = compactNumber(abs);
  } else {
    const decimals = opts.decimals ?? (abs >= 1000 ? 0 : 2);
    body = abs.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  const withSymbol = meta.symbolAfter
    ? `${body} ${meta.symbol}`
    : `${meta.symbol}${body}`;

  if (opts.signed && !neg) return `+${withSymbol}`;
  // Parentheses for negatives (§9 number rules)
  return neg ? `(${withSymbol})` : withSymbol;
}

function compactNumber(abs: number): string {
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}k`;
  return abs.toFixed(0);
}

/** One-decimal percentage. Input is a ratio (0.42 => 42.0%). */
export function formatPct(ratio: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (ratio === null || ratio === undefined || !isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const sign = opts.signed && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function deltaClass(n: number): string {
  if (n > 0) return "text-gain";
  if (n < 0) return "text-loss";
  return "text-ink-muted";
}
