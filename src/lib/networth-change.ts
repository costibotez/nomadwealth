/**
 * Period-over-period change of *total net worth*, derived from the net-worth
 * snapshot history — not from investment cost basis. This is what the overview
 * hero shows under the headline number, so the delta actually describes how the
 * whole balance sheet moved (property, cash, loans and all), rather than the
 * unrealized P/L of the holdings sleeve alone.
 */
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

export interface NetWorthChange {
  eur: number;
  pct: number | null;
  /** Human label for the span used, e.g. "past 30 days" or "since 8 Jun". */
  label: string;
}

/**
 * @param history  net-worth snapshots (any order); `date` is YYYY-MM-DD.
 * @param currentTotalEur  the live total shown in the hero (the "now" point).
 *
 * Prefers a trailing 30-day window; if all history is newer than that, falls
 * back to the earliest snapshot ("since <date>"). Returns null when there is no
 * prior reference point to compare against (a brand-new install).
 */
export function netWorthChange(
  history: { date: string; totalEur: number }[],
  currentTotalEur: number,
): NetWorthChange | null {
  if (history.length === 0) return null;

  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cutoff = Date.now() - WINDOW_DAYS * DAY_MS;

  // Latest snapshot at or before the 30-day cutoff.
  let baseline: { date: string; totalEur: number } | undefined;
  for (const h of sorted) {
    if (new Date(h.date).getTime() <= cutoff) baseline = h;
  }

  let label: string;
  if (baseline) {
    label = `past ${WINDOW_DAYS} days`;
  } else {
    // No point old enough for the window — compare against the earliest we have.
    baseline = sorted[0];
    // A single snapshot dated today gives us nothing to compare against.
    if (Date.now() - new Date(baseline.date).getTime() < DAY_MS) return null;
    label = `since ${new Date(baseline.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })}`;
  }

  const eur = currentTotalEur - baseline.totalEur;
  const pct = baseline.totalEur ? eur / baseline.totalEur : null;
  return { eur, pct, label };
}
