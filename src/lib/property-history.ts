/**
 * Historical valuation of a property, in its native currency.
 *
 * The "net worth over time" chart has no historical property-value table, so
 * past dates can't be marked to market. The previous behavior held today's
 * `value` flat for every day since acquisition — a horizontal line that ignored
 * how the property actually grew. Instead we interpolate LINEARLY from
 * `purchasePrice` at `purchaseDate` up to `value` today, so the curve shows the
 * gain accruing over time.
 *
 * Parity guarantee: at `isoDate === todayIso` this returns exactly `value`, so
 * the reconstructed history joins the live snapshot (which values property at
 * `value`) without a kink. When there's no purchase basis to interpolate from,
 * it falls back to the old flat `value` — no behavior change for those rows.
 *
 * This computes the value MAGNITUDE only; the caller is responsible for the
 * ownership window (skip dates before acquisition / on-or-after a sale).
 */
export interface PropertyValuationInput {
  purchaseDate: string | null; // YYYY-MM-DD
  purchasePrice: number | null; // native currency
  value: number; // current value, native currency
  saleDate: string | null; // YYYY-MM-DD
  salePrice: number | null; // native currency
}

const DAY_MS = 86_400_000;
const days = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / DAY_MS;

export function propertyValueAt(
  p: PropertyValuationInput,
  isoDate: string,
  todayIso: string,
): number {
  // No dated purchase basis → nothing to interpolate; hold flat (old behavior).
  if (!p.purchaseDate || p.purchasePrice == null || !Number.isFinite(p.purchasePrice)) {
    return p.value;
  }

  // Endpoint of the line: a sale (at salePrice, else last known value) if the
  // property was sold, otherwise today's value.
  const endDate = p.saleDate ?? todayIso;
  const endValue = p.saleDate ? p.salePrice ?? p.value : p.value;

  const span = days(p.purchaseDate, endDate);
  if (span <= 0) return endValue; // same-day (or inverted) → just the endpoint

  const f = Math.min(1, Math.max(0, days(p.purchaseDate, isoDate) / span));
  return p.purchasePrice + (endValue - p.purchasePrice) * f;
}
