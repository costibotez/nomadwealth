/**
 * Pure parsing logic for the one-time Excel import. No file or DB I/O lives
 * here — every function takes already-extracted rows (array-of-arrays) so it can
 * be unit-tested with small fixtures (see src/lib/__tests__).
 *
 * Robustness: these functions must never throw on a messy cell (#DIV/0!, blank,
 * subtotal row, string/number mix). They skip and let the caller log.
 */

export type AssetClass =
  | "ro_stock"
  | "us_stock"
  | "crypto"
  | "reit"
  | "mutual_fund"
  | "gold"
  | "other";

export type Row = (string | number | Date | null | undefined)[];

const ASSET_CLASSES: AssetClass[] = [
  "ro_stock",
  "us_stock",
  "crypto",
  "reit",
  "mutual_fund",
  "gold",
  "other",
];

/** Map a spreadsheet "Investment Type" label to our enum. */
export function mapAssetClass(label: unknown): AssetClass {
  const s = String(label ?? "").trim().toLowerCase();
  if (s.startsWith("ro stock") || s.startsWith("bvb")) return "ro_stock";
  if (s === "stock" || s.startsWith("us stock")) return "us_stock";
  if (s.startsWith("crypto")) return "crypto";
  if (s.startsWith("crowdfunding") || s.startsWith("reit")) return "reit";
  if (s.startsWith("mutual")) return "mutual_fund";
  if (s.startsWith("commodity") || s.startsWith("gold")) return "gold";
  return "other";
}

function isAssetLabel(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return (
    s.startsWith("ro stock") ||
    s === "stock" ||
    s.startsWith("crypto") ||
    s.startsWith("crowdfunding") ||
    s.startsWith("mutual") ||
    s.startsWith("commodity") ||
    s.startsWith("gold")
  );
}

function isDirection(v: unknown): "buy" | "sell" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "buy") return "buy";
  if (s === "sell") return "sell";
  return null;
}

/** Parse a cell that may be a JS Date, an Excel serial number, or a string. */
export function toISODate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && isFinite(value) && value > 0) {
    // Excel serial (1900 date system, accounting for the 1900 leap bug).
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const s = value.trim();
    // dd/mm/yyyy
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

/** Coerce a numeric cell; returns 0 for #DIV/0!, blanks, junk. */
export function num(value: unknown): number {
  if (typeof value === "number") return isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[%,$\s]/g, "");
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
}

export interface ParsedTxn {
  tradeDate: string;
  direction: "buy" | "sell";
  assetClass: AssetClass;
  symbol: string;
  quantity: number;
  unitCost: number;
  currentPrice: number;
  maturityDate: string | null;
}

/** Strip "722 Days" -> 722 (kept for completeness; not persisted). */
export function parseHoldingDays(v: unknown): number | null {
  const m = String(v ?? "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Parse the "Current Holdings" transaction rows. Header columns are detected by
 * name; the direction/asset-class columns are identified by VALUE (the file
 * swaps the "Investment Type"/"Trade Type" labels), so we scan for the Buy/Sell
 * cell and the asset-class cell per row.
 */
export function parseHoldings(rows: Row[]): {
  transactions: ParsedTxn[];
  skipped: number[];
} {
  const transactions: ParsedTxn[] = [];
  const skipped: number[] = [];
  if (rows.length === 0) return { transactions, skipped };

  // Locate header row (has "Date" and "Symbol").
  let headerIdx = rows.findIndex(
    (r) =>
      r.some((c) => String(c ?? "").trim().toLowerCase() === "date") &&
      r.some((c) => String(c ?? "").trim().toLowerCase() === "symbol"),
  );
  if (headerIdx < 0) headerIdx = 0;
  const header = rows[headerIdx].map((c) => String(c ?? "").trim().toLowerCase());

  const col = (needle: string) => header.findIndex((h) => h.includes(needle));
  const iDate = col("date");
  const iSymbol = col("symbol");
  const iQty = col("quantity");
  const iTokenPrice = header.findIndex((h) => h.includes("token price") || h.includes("open ("));
  const iCurrent = header.findIndex((h) => h.includes("current price"));

  const maturities = parseReitMaturities(rows);

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

    // Find direction + asset class by value among the first ~4 columns.
    let direction: "buy" | "sell" | null = null;
    let assetClass: AssetClass | null = null;
    for (let c = 0; c < Math.min(5, row.length); c++) {
      const d = isDirection(row[c]);
      if (d && !direction) direction = d;
      if (isAssetLabel(row[c]) && !assetClass) assetClass = mapAssetClass(row[c]);
    }
    const symbol = String(row[iSymbol] ?? "").trim();
    const date = toISODate(row[iDate]);

    // A valid transaction row needs a direction, a symbol and a date.
    if (!direction || !assetClass || !symbol || !date) {
      // Not a transaction (summary/aggregation/blank) — skip silently unless it
      // looked like one.
      if (direction && (!symbol || !date)) skipped.push(r + 1);
      continue;
    }

    const quantity = num(row[iQty]);
    const unitCost = iTokenPrice >= 0 ? num(row[iTokenPrice]) : 0;
    const currentPrice = iCurrent >= 0 ? num(row[iCurrent]) : 0;

    const maturityDate =
      assetClass === "reit" ? maturities.get(normSymbol(symbol)) ?? null : null;

    transactions.push({
      tradeDate: date,
      direction,
      assetClass,
      symbol,
      quantity,
      unitCost,
      currentPrice,
      maturityDate,
    });
  }

  return { transactions, skipped };
}

function normSymbol(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Best-effort extraction of REIT exit/maturity dates from the aggregation block.
 * Scans every row for a cell that looks like a dd/mm/yyyy (or Date) and pairs it
 * with a REIT-looking text cell in the same row.
 */
export function parseReitMaturities(rows: Row[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rows) {
    let labelCell: string | null = null;
    let dateCell: string | null = null;
    for (const c of row) {
      if (typeof c === "string") {
        const t = c.trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
          dateCell = toISODate(t);
        } else if (t.length > 3 && /[a-z]/i.test(t) && !/total|symbol|quantity|profit|invested|value/i.test(t)) {
          // candidate REIT name (first textual label in row)
          if (!labelCell) labelCell = t;
        }
      } else if (c instanceof Date) {
        dateCell = toISODate(c);
      }
    }
    if (labelCell && dateCell) {
      out.set(normSymbol(labelCell), dateCell);
    }
  }
  return out;
}

export interface ParsedRealized {
  assetClass: AssetClass;
  symbol: string;
  openDate: string | null;
  closeDate: string | null;
  quantity: number;
  cost: number;
  proceeds: number;
  pl: number;
}

/** Parse a "Past * Trades" sheet (header detected dynamically). */
export function parsePastTrades(rows: Row[]): ParsedRealized[] {
  const out: ParsedRealized[] = [];
  let headerIdx = rows.findIndex(
    (r) =>
      r.some((c) => String(c ?? "").toLowerCase().includes("open date")) &&
      r.some((c) => String(c ?? "").toLowerCase().includes("symbol")),
  );
  if (headerIdx < 0) return out;
  const header = rows[headerIdx].map((c) => String(c ?? "").trim().toLowerCase());
  const col = (n: string) => header.findIndex((h) => h.includes(n));
  const iOpen = col("open date");
  const iClose = col("close date");
  const iSymbol = col("symbol");
  const iQty = col("quantity");
  const iInvested = header.findIndex((h) => h.includes("money invest"));
  const iEnd = header.findIndex((h) => h.includes("end value"));
  const iReturns = header.findIndex((h) => h.includes("returns (") || h === "returns ($)");

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;
    const symbol = String(row[iSymbol] ?? "").trim();
    if (!symbol) continue;
    let assetClass: AssetClass = "other";
    for (let c = 0; c < Math.min(6, row.length); c++) {
      if (isAssetLabel(row[c])) {
        assetClass = mapAssetClass(row[c]);
        break;
      }
    }
    out.push({
      assetClass,
      symbol,
      openDate: toISODate(row[iOpen]),
      closeDate: toISODate(row[iClose]),
      quantity: num(row[iQty]),
      cost: iInvested >= 0 ? num(row[iInvested]) : 0,
      proceeds: iEnd >= 0 ? num(row[iEnd]) : 0,
      pl: iReturns >= 0 ? num(row[iReturns]) : 0,
    });
  }
  return out;
}

// ---- Plan Financiar (cash flow) -----------------------------------------
const MONTHS: Record<string, number> = {
  ian: 1, feb: 2, mar: 3, apr: 4, mai: 5, iun: 6,
  iul: 7, aug: 8, sep: 9, oct: 10, noi: 11, dec: 12,
};

export function monthNameToNum(v: unknown): number | null {
  const s = String(v ?? "").trim().toLowerCase().slice(0, 3);
  return MONTHS[s] ?? null;
}

export function normCurrency(v: unknown): string {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "EURO") return "EUR";
  if (s === "LEI") return "RON";
  return s || "GBP";
}

export interface ParsedCashflow {
  month: number;
  label: string;
  amount: number;
  currency: string;
  amountGbp: number;
}

/**
 * Parse Venituri/Cheltuieli. Month is carried down; "Total <Month>" subtotal
 * rows are skipped. Returns raw GBP-normalised amounts (caller converts to EUR).
 */
export function parseCashflowSheet(rows: Row[]): ParsedCashflow[] {
  const out: ParsedCashflow[] = [];
  // header: Luna | <label> | Suma | Valuta initiala | Suma finala (GBP)
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => String(c ?? "").trim().toLowerCase() === "luna"),
  );
  if (headerIdx < 0) headerIdx = 0;
  const header = rows[headerIdx].map((c) => String(c ?? "").trim().toLowerCase());
  const iLuna = header.findIndex((h) => h === "luna");
  const iLabel = iLuna + 1;
  const iSuma = header.findIndex((h) => h === "suma");
  const iVal = header.findIndex((h) => h.includes("valuta"));
  const iFinal = header.findIndex((h) => h.includes("finala"));

  let currentMonth: number | null = null;
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const lunaCell = String(row[iLuna] ?? "").trim();
    if (lunaCell) {
      if (lunaCell.toLowerCase().startsWith("total")) continue; // subtotal row
      const m = monthNameToNum(lunaCell);
      if (m) currentMonth = m;
    }
    const label = String(row[iLabel] ?? "").trim();
    if (!label || currentMonth === null) continue;
    if (label.toLowerCase().startsWith("total")) continue;

    const amount = num(row[iSuma]);
    const amountGbp = iFinal >= 0 ? num(row[iFinal]) : amount;
    if (amount === 0 && amountGbp === 0) continue;

    out.push({
      month: currentMonth,
      label,
      amount,
      currency: normCurrency(row[iVal]),
      amountGbp,
    });
  }
  return out;
}

const EXPENSE_CATEGORIES: Array<[RegExp, string]> = [
  [/contabil|avocat|taxe|impozit|tva/i, "Accounting & Legal"],
  [/chirie|intretinere|curent|engie|digi|gaz|electric/i, "Housing & Utilities"],
  [/netflix|yt premium|youtube|spotify|apple|google|kinsta|vercel|server|domain|idp|businesses/i, "Subscriptions & Tooling"],
  [/zbor|tren|feribot|benzina|deplas|flight/i, "Travel"],
  [/mama|botez|nunta|pensie|familie/i, "Family & Personal"],
];

export function categorizeExpense(label: string): string {
  for (const [re, cat] of EXPENSE_CATEGORIES) if (re.test(label)) return cat;
  return "Other";
}

export function categorizeIncome(label: string): string {
  return /retainer/i.test(label) ? "Recurring (retainer)" : "Project / one-off";
}

// ---- Dan loan schedule ---------------------------------------------------
export interface ParsedDanPayment {
  dueDate: string;
  amount: number;
  currency: string;
}

/** Parse "Dan Imprumut": An | Luna | Suma | Valuta (year carried down). */
export function parseDanSchedule(rows: Row[]): ParsedDanPayment[] {
  const out: ParsedDanPayment[] = [];
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => String(c ?? "").trim().toLowerCase() === "an"),
  );
  if (headerIdx < 0) headerIdx = 0;
  let year: number | null = null;
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    // find year cell (4-digit number) and month name + amount
    let rowYear: number | null = null;
    let month: number | null = null;
    let amount = 0;
    let currency = "RON";
    for (const c of row) {
      if (typeof c === "number" && c >= 2000 && c < 2100 && Number.isInteger(c)) {
        rowYear = c;
      } else if (typeof c === "string") {
        const m = monthNameToNum(c);
        if (m) month = m;
        else if (/ron|eur|gbp|lei/i.test(c.trim())) currency = normCurrency(c);
      }
    }
    // amount = largest plausible money number that isn't the year
    for (const c of row) {
      if (typeof c === "number" && (c < 2000 || c > 2100) && c > 0) amount = c;
    }
    if (rowYear) year = rowYear;
    if (year && month && amount > 0) {
      const due = `${year}-${String(month).padStart(2, "0")}-01`;
      out.push({ dueDate: due, amount, currency });
    }
  }
  return out;
}

export { ASSET_CLASSES };
