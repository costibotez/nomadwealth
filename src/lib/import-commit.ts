/**
 * Server-side import commit — turns mapped rows into typed inserts per asset
 * class. The web importer (P0-2) replaces the hardcoded scripts/import.ts: a
 * buyer uploads a CSV/Excel, maps columns in the browser, previews, then commits
 * here. Numeric/temporal values arrive as strings and are coerced defensively;
 * a row that lacks its required fields is skipped rather than aborting the batch.
 */
import "server-only";
import { db } from "@/db";
import {
  transactions,
  properties,
  loans,
  accounts,
  businesses,
  dividends,
} from "@/db/schema";
import { IMPORT_ASSET_CLASSES, type ImportAssetClass } from "@/lib/import-fields";

export { IMPORT_ASSET_CLASSES };
export type { ImportAssetClass };

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
};
const numStr = (v: unknown): string | undefined => {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = Number(s.replace(/[,\s]/g, "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? String(n) : undefined;
};
const isoDate = (v: unknown): string | undefined => {
  const s = str(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

function hasRequired(row: Row, required: string[]): boolean {
  return required.every((f) => str(row[f]) !== undefined);
}

const VALID_ASSET_CLASSES = new Set([
  "ro_stock", "us_stock", "crypto", "reit", "mutual_fund", "gold", "other",
]);
const VALID_ACCOUNT_TYPES = new Set([
  "crypto", "personal_cash", "company_cash", "savings", "brokerage",
]);

/** Commit mapped rows for one asset class. Returns the number of rows inserted. */
export async function commitImport(
  assetClass: ImportAssetClass,
  rows: Row[],
): Promise<number> {
  const spec = IMPORT_ASSET_CLASSES.find((a) => a.value === assetClass);
  if (!spec) throw new Error(`Unknown asset class: ${assetClass}`);
  const valid = rows.filter((r) => hasRequired(r, spec.required));
  if (valid.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);

  switch (assetClass) {
    case "holdings": {
      const values = valid.map((r) => ({
        symbol: str(r.symbol)!,
        quantity: numStr(r.quantity) ?? "0",
        unitCost: numStr(r.unitCost) ?? "0",
        costCurrency: str(r.costCurrency) ?? "USD",
        currentPrice: numStr(r.currentPrice) ?? "0",
        priceCurrency: str(r.costCurrency) ?? "USD",
        assetClass: (VALID_ASSET_CLASSES.has(str(r.assetClass) ?? "")
          ? (str(r.assetClass) as (typeof transactions.$inferInsert)["assetClass"])
          : "us_stock") as (typeof transactions.$inferInsert)["assetClass"],
        direction: (str(r.direction) === "sell" ? "sell" : "buy") as "buy" | "sell",
        tradeDate: isoDate(r.tradeDate) ?? today,
        notes: str(r.notes) ?? null,
      }));
      await db.insert(transactions).values(values);
      return values.length;
    }
    case "real_estate": {
      const values = valid.map((r) => ({
        name: str(r.name)!,
        value: numStr(r.value) ?? "0",
        currency: str(r.currency) ?? "EUR",
        monthlyRent: numStr(r.monthlyRent) ?? "0",
        purchaseDate: isoDate(r.purchaseDate) ?? null,
        purchasePrice: numStr(r.purchasePrice) ?? null,
        notes: str(r.notes) ?? null,
      }));
      await db.insert(properties).values(values);
      return values.length;
    }
    case "loans": {
      const values = valid.map((r) => ({
        borrower: str(r.borrower)!,
        principal: numStr(r.principal) ?? "0",
        currency: str(r.currency) ?? "EUR",
        interestRate: numStr(r.interestRate) ?? "0",
        startDate: isoDate(r.startDate) ?? null,
        termMonths: numStr(r.termMonths) ? Number(numStr(r.termMonths)) : null,
        notes: str(r.notes) ?? null,
      }));
      await db.insert(loans).values(values);
      return values.length;
    }
    case "cash": {
      const values = valid.map((r) => ({
        name: str(r.name)!,
        balance: numStr(r.balance) ?? "0",
        currency: str(r.currency) ?? "EUR",
        type: (VALID_ACCOUNT_TYPES.has(str(r.type) ?? "")
          ? (str(r.type) as (typeof accounts.$inferInsert)["type"])
          : "savings") as (typeof accounts.$inferInsert)["type"],
        notes: str(r.notes) ?? null,
      }));
      await db.insert(accounts).values(values);
      return values.length;
    }
    case "business": {
      const values = valid.map((r) => ({
        name: str(r.name)!,
        valuation: numStr(r.valuation) ?? null,
        currency: str(r.currency) ?? "EUR",
        startedOn: isoDate(r.startedOn) ?? null,
        notes: str(r.notes) ?? null,
      }));
      await db.insert(businesses).values(values);
      return values.length;
    }
    case "dividends": {
      const values = valid.map((r) => ({
        symbol: str(r.symbol)!,
        payDate: isoDate(r.payDate) ?? today,
        netAmount: numStr(r.netAmount) ?? null,
        amountPerShare: numStr(r.amountPerShare) ?? "0",
        currency: str(r.currency) ?? "RON",
        note: str(r.note) ?? null,
      }));
      await db.insert(dividends).values(values);
      return values.length;
    }
    default:
      return 0;
  }
}
