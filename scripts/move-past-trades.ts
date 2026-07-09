/**
 * Move the Past Stock / Crypto / Commodities trade sheets from `realized_trades` into `transactions`
 * as buy+sell pairs, so they show up on the Transactions page — WITHOUT
 * double-counting realized P/L.
 *
 *   pnpm move:past-trades                 # reads ./data/*.xlsx by name
 *   pnpm move:past-trades path/to/holdings.xlsx
 *
 * What it does, per closed trade in the "Past Stock Trades" sheet:
 *   1. inserts a BUY row  (tradeDate = open date,  unitCost = open price)
 *   2. inserts a SELL row (tradeDate = close date, unitCost = close price)
 *      — same quantity on both legs, so net position quantity is unchanged.
 *   3. soft-deletes the matching `realized_trades` row (so realized P/L is now
 *      derived from the transaction sells instead — counted exactly once).
 *
 * Prices are stored in each asset class's native currency (back-converted from
 * the sheet's USD figures) — identical convention to scripts/import.ts.
 *
 * Holdings safety:
 *   - Fully-exited symbols net to zero quantity → they never appear in holdings.
 *   - Symbols you STILL hold (e.g. META, MSFT, RGTI, BMBL, BTC, BT FIX) keep
 *     their live "current price": we copy it from the existing open lots onto
 *     the inserted legs, so current value / unrealized P/L of the live position
 *     is preserved. Their AVERAGE COST will shift (the historical buy blends in)
 *     — this was explicitly accepted.
 *
 * Idempotent: re-running first removes the rows it previously inserted (tagged
 * via the notes marker) and re-applies, so it's safe to run repeatedly.
 *
 * NOTE: `pnpm import` is truncate-and-reload and will revert this. Re-run this
 * script after any future full import.
 */
import * as path from "node:path";
import * as fs from "node:fs";
import XLSX from "xlsx";
import { and, eq, isNull, sql as dsql } from "drizzle-orm";
import { db, schema } from "./db";
import { parsePastTrades, type Row } from "../src/lib/import-parsers";

const MARKER = "moved-from-realized";
const SHEETS = [
  "Past Stock Trades",
  "Past Crypto Trades",
  "Past Commodities Trades",
  "Past Fund Trades",
];

// --- Currency convention (must match scripts/import.ts) -------------------
const USD_RON = 4.55;
const EUR_USD = 1.15;
const EUR_GBP = 0.85;
const NATIVE_CURRENCY: Record<string, string> = {
  ro_stock: "RON",
  us_stock: "USD",
  crypto: "USD",
  reit: "EUR",
  mutual_fund: "RON",
  gold: "GBP",
  other: "USD",
};
function fromUsd(usd: number, currency: string): number {
  switch (currency) {
    case "RON": return usd * USD_RON;
    case "EUR": return usd / EUR_USD;
    case "GBP": return (usd / EUR_USD) * EUR_GBP;
    default: return usd; // USD
  }
}

function findHoldingsFile(): string {
  const arg = process.argv[2];
  if (arg) return arg;
  const dir = path.resolve("data");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const holdings = files.find((f) => /nomad|holding|portfolio/i.test(f));
  if (!holdings) {
    throw new Error(
      `Could not find the holdings .xlsx in ./data. Pass a path:\n  pnpm move:past-trades <holdings.xlsx>`,
    );
  }
  return path.join(dir, holdings);
}

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as Row[];
}

async function main() {
  const file = findHoldingsFile();
  console.log(`📄 Holdings: ${file}\n`);
  const wb = XLSX.readFile(file, { cellDates: true });

  // Note: the Fund sheet has no Quantity/Open/Close columns — only invested &
  // end value — so those rows parse with quantity 0. We keep them (cost/proceeds
  // present) and synthesise quantity = 1 below.
  const trades = SHEETS.flatMap((s) => parsePastTrades(sheetRows(wb, s))).filter(
    (t) => t.symbol && t.openDate && t.closeDate && (t.quantity > 0 || t.cost > 0 || t.proceeds > 0),
  );
  if (trades.length === 0) throw new Error(`No parseable rows in ${SHEETS.join(", ")}.`);
  console.log(`Found ${trades.length} closed trades across ${SHEETS.join(", ")}.`);

  // --- 1. Clean up any previous run (idempotency) ------------------------
  const removed = await db
    .delete(schema.transactions)
    .where(eq(schema.transactions.notes, MARKER))
    .returning({ id: schema.transactions.id });
  if (removed.length) console.log(`↩️  Removed ${removed.length} rows from a previous run.`);

  // --- 2. Live current price per still-held symbol -----------------------
  // (uniform per symbol in this app; pick the max >0 just in case.)
  const existing = await db
    .select({
      assetClass: schema.transactions.assetClass,
      symbol: schema.transactions.symbol,
      currentPrice: schema.transactions.currentPrice,
      priceCurrency: schema.transactions.priceCurrency,
    })
    .from(schema.transactions)
    .where(isNull(schema.transactions.deletedAt));
  const livePrice = new Map<string, { price: string; currency: string }>();
  for (const r of existing) {
    const key = `${r.assetClass}::${r.symbol}`;
    const p = Number(r.currentPrice);
    const cur = livePrice.get(key);
    if (p > 0 && (!cur || p > Number(cur.price))) {
      livePrice.set(key, { price: r.currentPrice, currency: r.priceCurrency });
    }
  }

  // --- 3. Build buy+sell pairs ------------------------------------------
  const inserts: (typeof schema.transactions.$inferInsert)[] = [];
  for (const t of trades) {
    const cur = NATIVE_CURRENCY[t.assetClass] ?? "USD";
    // Funds have no share count → synthesise quantity 1 so the whole invested /
    // end value sits in unitCost. Buy & sell use the SAME quantity, so net
    // position quantity stays zero either way.
    const qty = t.quantity > 0 ? t.quantity : 1;
    const openUnitUsd = t.cost / qty; // money invested / qty
    const closeUnitUsd = t.proceeds / qty; // end value / qty
    const live = livePrice.get(`${t.assetClass}::${t.symbol}`);
    const priceStr = live ? live.price : "0";
    const priceCur = live ? live.currency : cur;

    const base = {
      assetClass: t.assetClass,
      symbol: t.symbol,
      quantity: String(qty),
      costCurrency: cur,
      currentPrice: priceStr,
      priceCurrency: priceCur,
      notes: MARKER,
    };
    inserts.push({
      ...base,
      tradeDate: t.openDate!,
      direction: "buy",
      unitCost: String(fromUsd(openUnitUsd, cur)),
    });
    inserts.push({
      ...base,
      tradeDate: t.closeDate!,
      direction: "sell",
      unitCost: String(fromUsd(closeUnitUsd, cur)),
    });
  }
  await db.insert(schema.transactions).values(inserts);
  console.log(`✅ Inserted ${inserts.length} transaction rows (${trades.length} buy + ${trades.length} sell).`);

  // --- 4. Soft-delete the matching realized_trades rows ------------------
  let softDeleted = 0;
  for (const t of trades) {
    const res = await db
      .update(schema.realizedTrades)
      .set({ deletedAt: new Date() })
      .where(
        and(
          isNull(schema.realizedTrades.deletedAt),
          eq(schema.realizedTrades.symbol, t.symbol),
          eq(schema.realizedTrades.openDate, t.openDate!),
          eq(schema.realizedTrades.closeDate, t.closeDate!),
          dsql`${schema.realizedTrades.quantity}::numeric = ${t.quantity}`,
        ),
      )
      .returning({ id: schema.realizedTrades.id });
    softDeleted += res.length;
  }
  console.log(`🗂️  Soft-deleted ${softDeleted} matching realized_trades rows.`);
  if (softDeleted < trades.length) {
    console.warn(
      `⚠️  ${trades.length - softDeleted} trades had no matching realized_trades row ` +
        `(already moved, or never imported). No double-count risk; just FYI.`,
    );
  }

  console.log("\nDone. The trades now appear on the Transactions page; realized P/L is unchanged.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
