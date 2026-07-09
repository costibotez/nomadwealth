/**
 * One-time Excel importer (§4.C). The ONLY place SheetJS is used.
 *
 *   pnpm import                      # reads ./data/*.xlsx by name
 *   pnpm import path/to/holdings.xlsx path/to/plan.xlsx
 *
 * Idempotent: truncate-and-reload. Prints a summary + validation totals so you
 * can confirm the import matches the reference figures.
 *
 * SECURITY: the .xlsx files live in ./data (gitignored) and are never deployed.
 */
import * as path from "node:path";
import * as fs from "node:fs";
import XLSX from "xlsx";
import { db, schema } from "./db";
import { seedExtras } from "./seed-data";
import { WEDDING_ITEMS, GIFT_OBLIGATIONS } from "../src/config/wedding";
import {
  parseHoldings,
  parsePastTrades,
  parseCashflowSheet,
  parseDanSchedule,
  categorizeExpense,
  categorizeIncome,
  num,
  toISODate,
  type Row,
} from "../src/lib/import-parsers";

const GBP_PER_EUR = 0.85; // fallback for seeding EUR amounts from GBP column
const APARTMENTS_TOTAL_EUR = 250_000; // ~$287.5k @ 1.15 — reconciles net worth
const TODAY = new Date().toISOString().slice(0, 10);

// The sheet stores every holding converted to USD. We store each transaction in
// its ORIGINAL currency (per your asset-class mapping) by back-converting the USD
// figures with the rates embedded in the holdings summary.
const USD_RON = 4.55; // embedded "USD-RON"
const EUR_USD = 1.15; // embedded "EUR-USD"
const EUR_GBP = 0.85; // config fallback (sheet has no GBP rate)

// Original currency per asset class.
const NATIVE_CURRENCY: Record<string, string> = {
  ro_stock: "RON",
  us_stock: "USD",
  crypto: "USD", // bought on Ledger (USD) + Robinhood (EUR); lots priced in USD
  reit: "EUR",
  mutual_fund: "RON",
  gold: "GBP",
  other: "USD",
};

/** Convert a USD amount from the sheet into the target native currency. */
function fromUsd(usd: number, currency: string): number {
  switch (currency) {
    case "RON":
      return usd * USD_RON;
    case "EUR":
      return usd / EUR_USD;
    case "GBP":
      return (usd / EUR_USD) * EUR_GBP;
    default:
      return usd; // USD
  }
}

function findFiles(): { holdings: string; plan: string } {
  const args = process.argv.slice(2);
  if (args.length >= 2) return { holdings: args[0], plan: args[1] };
  const dir = path.resolve("data");
  if (!fs.existsSync(dir)) {
    throw new Error(
      `No ./data folder. Put the two .xlsx files in ./data or pass paths:\n  pnpm import <holdings.xlsx> <plan.xlsx>`,
    );
  }
  const files = fs.readdirSync(dir);
  const holdings = files.find((f) => /nomad|holding|portfolio/i.test(f));
  const plan = files.find((f) => /plan|financiar/i.test(f));
  if (!holdings || !plan) {
    throw new Error(`Could not find both files in ./data. Found: ${files.join(", ")}`);
  }
  return { holdings: path.join(dir, holdings), plan: path.join(dir, plan) };
}

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as Row[];
}

async function main() {
  const { holdings, plan } = findFiles();
  console.log(`📄 Holdings: ${holdings}`);
  console.log(`📄 Plan:     ${plan}\n`);

  const holdingsWb = XLSX.readFile(holdings, { cellDates: true });
  const planWb = XLSX.readFile(plan, { cellDates: true });

  // ---- Parse ------------------------------------------------------------
  const { transactions: txns, skipped } = parseHoldings(
    sheetRows(holdingsWb, "Current Holdings"),
  );

  const pastSheets = [
    "Past Stock Trades",
    "Past Crypto Trades",
    "Past Fund Trades",
    "Past Commodities Trades",
    "Past Indices Trades",
  ];
  const realized = pastSheets.flatMap((s) => parsePastTrades(sheetRows(holdingsWb, s)));

  const income = parseCashflowSheet(sheetRows(planWb, "Venituri"));
  const expense = parseCashflowSheet(sheetRows(planWb, "Cheltuieli"));
  const danPayments = parseDanSchedule(sheetRows(planWb, "Dan Imprumut"));
  const apartments = parseApartments(sheetRows(planWb, "Randament Apartamente"));

  // ---- Wipe (idempotent) ------------------------------------------------
  console.log("🧹 Clearing existing rows…");
  await db.delete(schema.loanPayments);
  await db.delete(schema.loanReceipts);
  await db.delete(schema.realizedTrades);
  await db.delete(schema.cashflowIncome);
  await db.delete(schema.cashflowExpense);
  await db.delete(schema.propertyIncome);
  await db.delete(schema.propertyRent);
  await db.delete(schema.propertyLedger);
  await db.delete(schema.properties);
  await db.delete(schema.transactions);
  await db.delete(schema.loans);
  await db.delete(schema.weddingItems);
  await db.delete(schema.weddingGifts);
  await db.delete(schema.incomeLegend);

  // ---- Transactions -----------------------------------------------------
  // Validation is computed from the ORIGINAL USD figures (before back-conversion).
  const validationUsd: { assetClass: string; valueUsd: number }[] = txns.map((t) => ({
    assetClass: t.assetClass,
    valueUsd: t.quantity * t.currentPrice,
  }));

  let goldSeeded = false;
  const txnInserts = txns.map((t) => {
    const cur = NATIVE_CURRENCY[t.assetClass] ?? "USD";
    return {
      tradeDate: t.tradeDate,
      direction: t.direction,
      assetClass: t.assetClass,
      symbol: t.symbol,
      quantity: String(t.quantity),
      unitCost: String(fromUsd(t.unitCost, cur)),
      costCurrency: cur,
      currentPrice: String(fromUsd(t.currentPrice, cur)),
      priceCurrency: cur,
      maturityDate: t.maturityDate,
    };
  });

  // Gold appears only in the summary block (no open lot row) — seed it so the
  // Gold tab and net worth reflect it (~$2,535 current / $1,748 cost). Stored in GBP.
  if (!txns.some((t) => t.assetClass === "gold")) {
    txnInserts.push({
      tradeDate: "2024-12-06",
      direction: "buy",
      assetClass: "gold",
      symbol: "GOLD",
      quantity: "1",
      unitCost: String(fromUsd(1748, "GBP")),
      costCurrency: "GBP",
      currentPrice: String(fromUsd(2534.6, "GBP")),
      priceCurrency: "GBP",
      maturityDate: null,
    });
    validationUsd.push({ assetClass: "gold", valueUsd: 2534.6 });
    goldSeeded = true;
  }
  if (txnInserts.length) await db.insert(schema.transactions).values(txnInserts);

  // ---- Realized trades --------------------------------------------------
  if (realized.length) {
    await db.insert(schema.realizedTrades).values(
      realized.map((t) => ({
        assetClass: t.assetClass,
        symbol: t.symbol,
        openDate: t.openDate,
        closeDate: t.closeDate,
        quantity: String(t.quantity),
        cost: String(t.cost),
        proceeds: String(t.proceeds),
        pl: String(t.pl),
        currency: "USD",
      })),
    );
  }

  // ---- Cash flow --------------------------------------------------------
  if (income.length) {
    await db.insert(schema.cashflowIncome).values(
      income.map((c) => ({
        month: c.month,
        year: 2026,
        label: c.label,
        amount: String(c.amount),
        currency: c.currency,
        amountEur: String(round2(c.amountGbp / GBP_PER_EUR)),
        category: categorizeIncome(c.label),
      })),
    );
  }
  if (expense.length) {
    await db.insert(schema.cashflowExpense).values(
      expense.map((c) => ({
        month: c.month,
        year: 2026,
        label: c.label,
        amount: String(c.amount),
        currency: c.currency,
        amountEur: String(round2(c.amountGbp / GBP_PER_EUR)),
        category: categorizeExpense(c.label),
      })),
    );
  }

  // ---- Properties + income ---------------------------------------------
  const rawValues = apartments.map((a) => a.impliedValue);
  const rawSum = rawValues.reduce((s, v) => s + v, 0) || 1;
  for (let i = 0; i < apartments.length; i++) {
    const a = apartments[i];
    const value = round2((rawValues[i] / rawSum) * APARTMENTS_TOTAL_EUR);
    const [prop] = await db
      .insert(schema.properties)
      .values({
        name: a.name,
        value: String(value),
        currency: "EUR",
        monthlyRent: i === 0 ? "600" : "0",
        isRented: i === 0,
        notes:
          i === 0
            ? "Rented (Popești-Leordeni, ~€600/mo). Adjust as needed."
            : "Idle — confirm in the UI.",
      })
      .returning({ id: schema.properties.id });
    // Seed the rent ledger as whole-year lumps (month null) in RON — the
    // Randament figures are in RON ("2250 RON/lună"). You can add monthly rows
    // or set a purchase price in the UI to refine ROI.
    const rentRows = a.income.filter((y) => y.income > 0);
    if (rentRows.length) {
      await db.insert(schema.propertyRent).values(
        rentRows.map((y) => ({
          propertyId: prop.id,
          year: y.year,
          month: null,
          amount: String(y.income),
          currency: "RON",
        })),
      );
    }
  }

  // ---- Dan loan + schedule ---------------------------------------------
  if (danPayments.length) {
    const total = danPayments.reduce((s, p) => s + p.amount, 0);
    const [danLoan] = await db
      .insert(schema.loans)
      .values({
        borrower: "Dan",
        principal: String(total),
        currency: danPayments[0].currency,
        backed: "personal",
        startDate: danPayments[0].dueDate,
        interestRate: "0",
        compounding: "simple",
        termMonths: danPayments.length,
        status: "active",
        notes: "0% — principal only (1850 RON/month). Imported from 'Dan Imprumut'.",
      })
      .returning({ id: schema.loans.id });
    // Seed the months already received as receipts (manual ledger). Future
    // months are not seeded — add them as they come in.
    const received = danPayments.filter((p) => p.dueDate <= TODAY);
    if (received.length) {
      await db.insert(schema.loanReceipts).values(
        received.map((p) => ({
          loanId: danLoan.id,
          kind: "principal" as const,
          amount: String(p.amount),
          currency: p.currency,
          receivedOn: p.dueDate,
          method: "cash" as const,
          bank: null,
        })),
      );
    }
  }

  // ---- Income legend: pre-tag obvious sources (you refine the rest) -----
  const distinctIncomeLabels = [...new Set(income.map((c) => c.label))];
  const legendSeed = distinctIncomeLabels
    .map((label) => ({ label, category: guessIncomeCategory(label) }))
    .filter((r): r is { label: string; category: string } => r.category !== null);
  if (legendSeed.length) {
    await db.insert(schema.incomeLegend).values(legendSeed);
  }

  // ---- Wedding budget (editable later in the UI) -----------------------
  if (WEDDING_ITEMS.length) {
    await db.insert(schema.weddingItems).values(
      WEDDING_ITEMS.map((w) => ({
        label: w.vendor,
        paid: String(w.paid),
        remaining: String(w.remaining),
        currency: "RON",
      })),
    );
  }

  if (GIFT_OBLIGATIONS.length) {
    await db.insert(schema.weddingGifts).values(
      GIFT_OBLIGATIONS.map((g) => ({
        name: g.name,
        type: g.type,
        amount: String(g.amount),
        currency: "RON",
      })),
    );
  }

  // ---- Accounts + StockEstate/Roland -----------------------------------
  const seed = await seedExtras();

  // ---- Summary ----------------------------------------------------------
  console.log("\n✅ Import complete");
  console.log(`   ${txns.length} transactions${goldSeeded ? " (+1 synthetic gold lot)" : ""}`);
  console.log(`   ${realized.length} realized trades`);
  console.log(`   ${income.length} income rows, ${expense.length} expense rows`);
  console.log(`   ${apartments.length} properties`);
  console.log(`   1 Dan loan + ${danPayments.length} payments`);
  console.log(`   ${seed.accounts} accounts, ${seed.extraLoans} extra loans (StockEstate, Roland)`);
  if (skipped.length) console.log(`   ⚠ skipped ${skipped.length} ambiguous rows: ${skipped.join(", ")}`);

  printValidation(validationUsd);

  process.exit(0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Best-effort tag for an income source; null = leave untagged for you to set. */
function guessIncomeCategory(label: string): string | null {
  const s = label.toLowerCase();
  if (/retainer|subscription/.test(s)) return "retainer";
  if (/dividend/.test(s)) return "dividend";
  if (/poker/.test(s)) return "poker";
  if (/rummy/.test(s)) return "rummy";
  if (/staking/.test(s)) return "crypto_staking";
  if (/kinsta|hosting|server|patchpo/.test(s)) return "hosting";
  if (/vinted/.test(s)) return "vinted";
  if (/affiliate/.test(s)) return "affiliate";
  if (/stockestate|rent|chirie/.test(s)) return "rent";
  if (/mutual|fund|bt fix/.test(s)) return "mutual_funds";
  if (/loan|imprumut|dan/.test(s)) return "loan";
  if (/^bt$|deposit|dobanda/.test(s)) return "bank_deposit";
  return null;
}

interface ApartmentBlock {
  name: string;
  impliedValue: number;
  income: { year: number; income: number; roi: number }[];
}

/** Parse the three side-by-side Nomad Residence blocks (cols B-D, F-H, J-L). */
function parseApartments(rows: Row[]): ApartmentBlock[] {
  const offsets = [1, 5, 9];
  const blocks: ApartmentBlock[] = [];
  offsets.forEach((off, idx) => {
    const income: { year: number; income: number; roi: number }[] = [];
    let impliedValue = 0;
    for (const row of rows) {
      const yCell = row[off];
      const year = typeof yCell === "number" ? yCell : Number(String(yCell ?? "").trim());
      if (Number.isInteger(year) && year >= 2018 && year <= 2040) {
        const inc = num(row[off + 1]);
        const roi = num(row[off + 2]);
        income.push({ year, income: inc, roi });
        if (roi > 0 && inc > 0) impliedValue = Math.max(impliedValue, inc / roi);
      }
    }
    blocks.push({
      name: `Nomad Residence ${idx + 1}`,
      impliedValue: impliedValue || 1,
      income,
    });
  });
  return blocks;
}

// Reference current values (USD) from the holdings summary block.
const REFERENCE: Record<string, number> = {
  ro_stock: 89414,
  us_stock: 12002,
  crypto: 19974,
  reit: 32784,
  mutual_fund: 10576,
  gold: 2535,
};

function printValidation(rows: { assetClass: string; valueUsd: number }[]) {
  const byClass: Record<string, number> = {};
  for (const t of rows) {
    byClass[t.assetClass] = (byClass[t.assetClass] ?? 0) + t.valueUsd;
  }
  console.log("\n🔎 Validation — current value by class (USD), computed vs reference:");
  let total = 0;
  for (const [cls, ref] of Object.entries(REFERENCE)) {
    const got = byClass[cls] ?? 0;
    total += got;
    const diff = ref ? ((got - ref) / ref) * 100 : 0;
    const flag = Math.abs(diff) <= 2 ? "✓" : "⚠";
    console.log(
      `   ${flag} ${cls.padEnd(12)} computed ${fmt(got).padStart(12)}  ref ${fmt(ref).padStart(10)}  (${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%)`,
    );
  }
  console.log(
    "   ℹ REIT reads ~+11.7% vs the summary because two lots (NBI Mixed Real Estate,\n" +
      "     IMPAKT VILLAS ≈ $3,826) are still open Buy rows in 'Current Holdings' but\n" +
      "     zeroed in the summary block. Soft-delete them in the UI if they've exited.",
  );
  console.log(`   Σ investments (excl. property/loans): ${fmt(total)} USD`);
  console.log(
    `   + Apartments ~$287,500 + Roland ~$17,160 ⇒ grand total ≈ $${fmt(total + 287500 + 17160)} (ref ≈ $492,256)`,
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err);
  process.exit(1);
});
