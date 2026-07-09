/**
 * Client-safe import metadata: the asset classes the web importer supports and
 * their target fields. Shared by the importer UI (client) and the commit logic
 * (server, lib/import-commit.ts) so the two never drift.
 */
export type ImportAssetClass =
  | "holdings"
  | "real_estate"
  | "loans"
  | "cash"
  | "business"
  | "dividends";

export interface ImportClassSpec {
  value: ImportAssetClass;
  label: string;
  /** Target fields, in display order. */
  fields: string[];
  /** Fields a row must have to be committed. */
  required: string[];
  /** Human hint shown under the picker. */
  hint: string;
}

export const IMPORT_ASSET_CLASSES: ImportClassSpec[] = [
  {
    value: "holdings",
    label: "Holdings / transactions",
    fields: ["symbol", "quantity", "unitCost", "costCurrency", "currentPrice", "assetClass", "direction", "tradeDate", "notes"],
    required: ["symbol", "quantity"],
    hint: "Public stocks, crypto, funds — one row per lot.",
  },
  {
    value: "real_estate",
    label: "Real estate",
    fields: ["name", "value", "currency", "monthlyRent", "purchaseDate", "purchasePrice", "notes"],
    required: ["name", "value"],
    hint: "Properties you own — one row each.",
  },
  {
    value: "loans",
    label: "Loans receivable",
    fields: ["borrower", "principal", "currency", "interestRate", "startDate", "termMonths", "notes"],
    required: ["borrower", "principal"],
    hint: "Money lent out — one row per loan.",
  },
  {
    value: "cash",
    label: "Cash accounts",
    fields: ["name", "balance", "currency", "type", "notes"],
    required: ["name", "balance"],
    hint: "Bank / savings / brokerage cash balances.",
  },
  {
    value: "business",
    label: "Businesses",
    fields: ["name", "valuation", "currency", "startedOn", "notes"],
    required: ["name"],
    hint: "Businesses you own — one row each.",
  },
  {
    value: "dividends",
    label: "Dividends",
    fields: ["symbol", "payDate", "netAmount", "amountPerShare", "currency", "note"],
    required: ["symbol", "payDate"],
    hint: "Dividend payouts received.",
  },
];

export function specFor(assetClass: ImportAssetClass): ImportClassSpec {
  const s = IMPORT_ASSET_CLASSES.find((a) => a.value === assetClass);
  if (!s) throw new Error(`Unknown asset class: ${assetClass}`);
  return s;
}
