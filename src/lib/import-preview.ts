/**
 * Client-side spreadsheet preview + column auto-mapping.
 *
 * Used by the setup wizard (step 3) and the in-app importer to show a mapping
 * table BEFORE anything is sent to the server. Parsing happens in the browser,
 * so a preview never transmits financial data — in keeping with the privacy
 * invariant. The authoritative import + commit is done server-side (P0-2).
 */

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface MappedPreview {
  fileName: string;
  rowCount: number;
  rows: { csv: string; field: string | null }[];
}

/** Canonical NomadWealth import fields and the header synonyms that map to them. */
export const FIELD_SYNONYMS: Record<string, string[]> = {
  symbol: ["symbol", "ticker", "asset", "instrument", "name", "stock", "coin"],
  quantity: ["quantity", "qty", "shares", "units", "amount", "size", "count"],
  unitCost: ["unit cost", "avg cost", "average cost", "cost", "price", "buy price", "cost basis"],
  currentPrice: ["current price", "last", "market price", "price now", "close"],
  costCurrency: ["currency", "cost currency", "ccy"],
  tradeDate: ["date", "trade date", "purchase date", "buy date", "opened", "acquired"],
  direction: ["direction", "side", "type", "buy/sell", "action"],
  assetClass: ["asset class", "class", "category", "market"],
  value: ["value", "market value", "total value", "balance"],
  notes: ["notes", "note", "comment", "description", "memo"],
};

function matchField(header: string): string | null {
  const h = header.trim().toLowerCase();
  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (synonyms.some((s) => h === s || h.replace(/[_-]/g, " ") === s)) {
      return field;
    }
  }
  // looser contains-match as a fallback
  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (synonyms.some((s) => h.includes(s))) return field;
  }
  return null;
}

/** Parse the first sheet of a CSV/XLSX file into headers + row objects. */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

/** Build the mapping preview (matched fields highlighted, others ignored). */
export function autoMapColumns(
  fileName: string,
  sheet: ParsedSheet,
): MappedPreview {
  return {
    fileName,
    rowCount: sheet.rows.length,
    rows: sheet.headers.map((csv) => ({ csv, field: matchField(csv) })),
  };
}
