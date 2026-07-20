/**
 * Pure valuation logic behind `scripts/backfill-snapshots.ts`.
 *
 * The valuation model ("cost basis, blend to today") is documented in that
 * script's header. This module holds the per-day component valuations as pure
 * functions over plain row shapes so they can be unit-tested without a DB —
 * the script stays a thin I/O shell (env, queries, upsert).
 *
 * All `numeric` DB columns arrive as strings; `num()` coerces defensively.
 */
// Relative imports (not "@/") so this module also resolves under tsx, which
// runs the scripts/ entrypoints without the tsconfig path alias.
import { loanState, interestToDate, type Compounding } from "./finance";
import { propertyValueAt } from "./property-history";
import type { Currency } from "../config/fx";

export const num = (v: unknown): number => {
  const x = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(x) ? x : 0;
};

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (isoDate: string, days: number) =>
  iso(new Date(Date.parse(isoDate) + days * DAY));

export type ToEur = (amount: number, currency: string) => number;

/** EUR-conversion using a single rate table (EUR -> X). Unknown currency ⇒ assume EUR. */
export function makeToEur(rates: Record<Currency, number>): ToEur {
  return (amount, currency) => {
    const c = (currency || "EUR").toUpperCase() as Currency;
    const rate = rates[c];
    if (!rate || rate === 0) return amount;
    return amount / rate;
  };
}

// ---- input row shapes (subset of the DB rows the script selects) ----------

export interface TxnRow {
  tradeDate: string | null;
  direction: string;
  quantity: unknown;
  unitCost: unknown;
  costCurrency: string;
  currentPrice: unknown;
  priceCurrency: string;
}

export interface RealizedRow {
  openDate: string | null;
  closeDate: string | null;
  cost: unknown;
  currency: string;
}

export interface LoanRow {
  id: number;
  startDate: string | null;
  principal: unknown;
  interestRate: unknown;
  termMonths: number | null;
  compounding: string;
  currency: string;
}

export interface LoanReceiptRow {
  loanId: number;
  receivedOn: string;
  amount: unknown;
  kind: string;
}

export interface PropertyRow {
  id: number;
  purchaseDate: string | null;
  purchasePrice: unknown;
  value: unknown;
  saleDate: string | null;
  salePrice: unknown;
  status: string;
  currency: string;
}

export interface PropertyLedgerRow {
  propertyId: number;
  occurredOn: string | null;
}

// ---- per-day component valuations -----------------------------------------

/**
 * Money actually invested as of day `d` (cost basis): open transactions traded
 * on/before `d`, plus realized trades that were still open on `d`
 * (openDate ≤ d < closeDate). Sells subtract.
 */
export function investmentsCostEur(
  d: string,
  open: TxnRow[],
  realized: RealizedRow[],
  toEur: ToEur,
): number {
  let v = 0;
  for (const t of open) {
    if (!t.tradeDate || t.tradeDate > d) continue;
    const cost = toEur(num(t.quantity) * num(t.unitCost), t.costCurrency);
    v += t.direction === "sell" ? -cost : cost;
  }
  for (const r of realized) {
    if (!r.openDate || r.openDate > d) continue;
    if (r.closeDate && r.closeDate <= d) continue;
    v += toEur(num(r.cost), r.currency);
  }
  return v;
}

/** Live market value (qty × current price) of open transactions. Sells subtract. */
export function investmentsMarketEur(open: TxnRow[], toEur: ToEur): number {
  let v = 0;
  for (const t of open) {
    const mv = toEur(num(t.quantity) * num(t.currentPrice), t.priceCurrency);
    v += t.direction === "sell" ? -mv : mv;
  }
  return v;
}

/**
 * Outstanding loan value as of day `d`: principal remaining plus interest
 * accrued-but-unpaid, from receipts received on/before `d`.
 */
export function loansOutstandingEur(
  d: string,
  loans: LoanRow[],
  receipts: LoanReceiptRow[],
  toEur: ToEur,
): number {
  let v = 0;
  for (const l of loans) {
    if (!l.startDate || l.startDate > d) continue;
    const start = new Date(l.startDate);
    const asOf = new Date(d);
    const rcpts = receipts
      .filter((r) => r.loanId === l.id && r.receivedOn <= d)
      .map((r) => ({
        date: new Date(r.receivedOn),
        amount: num(r.amount),
        kind: r.kind as "principal" | "interest",
      }));
    const state = loanState(num(l.principal), start, [], rcpts);
    const interest = interestToDate(
      num(l.principal),
      num(l.interestRate),
      start,
      asOf,
      l.termMonths ?? null,
      l.compounding as Compounding,
    );
    const outstanding =
      state.principalRemaining + Math.max(0, interest - state.interestReceived);
    v += toEur(outstanding, l.currency);
  }
  return v;
}

/**
 * Property value as of day `d`, interpolated from purchase basis to today's
 * `value` (see lib/property-history). Excludes properties not yet acquired on
 * `d` (acquisition = earliest of purchaseDate, first dated ledger entry, else
 * `seriesStart`) and properties already sold.
 */
export function propertiesValueEur(
  d: string,
  today: string,
  properties: PropertyRow[],
  propLedger: PropertyLedgerRow[],
  seriesStart: string,
  toEur: ToEur,
): number {
  const firstLedgerDate = (propertyId: number): string | null => {
    const dates = propLedger
      .filter((e) => e.propertyId === propertyId && e.occurredOn)
      .map((e) => e.occurredOn as string)
      .sort();
    return dates[0] ?? null;
  };
  let v = 0;
  for (const p of properties) {
    const acquired = p.purchaseDate ?? firstLedgerDate(p.id) ?? seriesStart;
    if (acquired > d) continue;
    if (p.saleDate && p.saleDate <= d) continue;
    if (!p.saleDate && p.status === "sold") continue;
    const native = propertyValueAt(
      {
        purchaseDate: p.purchaseDate,
        purchasePrice: p.purchasePrice != null ? num(p.purchasePrice) : null,
        value: num(p.value),
        saleDate: p.saleDate,
        salePrice: p.salePrice != null ? num(p.salePrice) : null,
      },
      d,
      today,
    );
    v += toEur(native, p.currency);
  }
  return v;
}
