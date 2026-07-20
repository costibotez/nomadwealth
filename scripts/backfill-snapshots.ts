/**
 * Backfill daily net-worth snapshots from history.
 *
 *   pnpm backfill:snapshots          # write snapshots to the DB
 *   pnpm backfill:snapshots --dry    # print the curve, write nothing
 *
 * WHY THIS EXISTS
 * The Overview "Net worth over time" chart reads `net_worth_snapshots`, one row
 * per day, written by the price-refresh cron. That only starts accruing the day
 * the cron first runs, so until then every range (1M/3M/1Y/All) shows the same
 * 2–3 points. This script reconstructs the missing history.
 *
 * HOW IT VALUES THINGS (important — read before trusting the curve)
 * There is no historical price table: each holding stores only its CURRENT
 * price. So past dates cannot be marked to market. Instead:
 *   - Investments (past dates) = COST BASIS — the money actually invested as of
 *     that day, from transaction trade dates (+ realized trades that were still
 *     open then). The curve therefore grows each time you bought, not with
 *     market moves.
 *   - Investments (TODAY only) = live MARKET VALUE (qty × current price). So the
 *     final point steps up to your real net worth; the size of that step is your
 *     unrealized gain. ("Cost basis, blend to today.")
 *   - Loans = principal remaining + interest accrued, evaluated as of each day
 *     from the receipts ledger.
 *   - Properties = acquisition ledger entries on/before each day, minus sales.
 *   - Cash accounts = held flat at the current balance (no balance history
 *     exists to reconstruct).
 *   - FX = today's rates applied to all dates (no historical FX stored).
 *
 * It UPSERTS by date, so it is safe to re-run, and it will not clobber a more
 * accurate snapshot the cron later records for today (the cron uses true market
 * value too).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db, schema } from "./db";
import {
  num as n,
  addDays,
  makeToEur,
  investmentsCostEur,
  investmentsMarketEur,
  loansOutstandingEur,
  propertiesValueEur,
} from "../src/lib/backfill-valuation";
import { FALLBACK_RATES, CURRENCIES, type Currency } from "../src/config/fx";

const DRY = process.argv.includes("--dry");
const today = new Date().toISOString().slice(0, 10);

/** Live EUR rates from Frankfurter, falling back to the static table. */
async function getRates(): Promise<Record<Currency, number>> {
  const quotes = CURRENCIES.filter((c) => c !== "EUR");
  try {
    const url = `https://api.frankfurter.app/latest?from=EUR&to=${quotes.join(",")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = (await res.json()) as { rates: Record<string, number> };
      const rates: Record<Currency, number> = { ...FALLBACK_RATES, EUR: 1 };
      for (const q of quotes) if (typeof data.rates?.[q] === "number") rates[q] = data.rates[q];
      console.log("FX: live rates from frankfurter.app");
      return rates;
    }
  } catch {
    /* fall through */
  }
  console.log("FX: live fetch failed — using fallback rates");
  return { ...FALLBACK_RATES };
}

async function main() {
  const rates = await getRates();
  const toEur = makeToEur(rates);

  const [txns, realized, accounts, loans, receipts, properties, propLedger] =
    await Promise.all([
      db.select().from(schema.transactions),
      db.select().from(schema.realizedTrades),
      db.select().from(schema.accounts),
      db.select().from(schema.loans),
      db.select().from(schema.loanReceipts),
      db.select().from(schema.properties),
      db.select().from(schema.propertyLedger),
    ]);

  const open = txns.filter((t) => !t.deletedAt);

  // ---- earliest date across all activity --------------------------------
  const dates: string[] = [];
  for (const t of open) if (t.tradeDate) dates.push(t.tradeDate);
  for (const r of realized) if (r.openDate) dates.push(r.openDate);
  for (const l of loans) if (l.startDate) dates.push(l.startDate);
  for (const r of receipts) if (r.receivedOn) dates.push(r.receivedOn);
  for (const p of properties) if (p.purchaseDate) dates.push(p.purchaseDate);
  for (const e of propLedger) if (e.occurredOn) dates.push(e.occurredOn);
  if (dates.length === 0) {
    console.error("No dated activity found — nothing to backfill.");
    process.exit(1);
  }
  const start = dates.reduce((a, b) => (a < b ? a : b));

  // ---- components that are held flat (no history) -----------------------
  const accountsEur = accounts.reduce((s, a) => s + toEur(n(a.balance), a.currency), 0);
  const companyCashEur = accounts
    .filter((a) => a.isCompany)
    .reduce((s, a) => s + toEur(n(a.balance), a.currency), 0);

  // ---- build the daily series -------------------------------------------
  // Per-day component valuations live in src/lib/backfill-valuation.ts (unit
  // tested there); the property curve interpolates purchase basis → today's
  // value via lib/property-history.
  const rows: (typeof schema.netWorthSnapshots.$inferInsert)[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const isToday = d === today;
    const investmentsEur = isToday
      ? investmentsMarketEur(open, toEur)
      : investmentsCostEur(d, open, realized, toEur);
    const loanEur = loansOutstandingEur(d, loans, receipts, toEur);
    const propEur = propertiesValueEur(d, today, properties, propLedger, start, toEur);
    const totalEur = investmentsEur + accountsEur + loanEur + propEur;
    const personalEur = totalEur - companyCashEur;
    rows.push({
      snapshotDate: d,
      totalEur: String(totalEur),
      personalEur: String(personalEur),
      investmentsEur: String(investmentsEur),
      accountsEur: String(accountsEur),
      loansEur: String(loanEur),
      propertiesEur: String(propEur),
    });
  }

  console.log(
    `\nReconstructed ${rows.length} daily snapshots: ${start} → ${today}`,
  );
  const f = rows[0], l = rows[rows.length - 1];
  const fmt = (s: string) => Math.round(n(s)).toLocaleString();
  console.log(`  first total: €${fmt(f.totalEur)}  (cost basis)`);
  console.log(`  last  total: €${fmt(l.totalEur)}  (market value)`);

  if (DRY) {
    console.log("\n--dry: no rows written. Sample (every ~10%):");
    const step = Math.max(1, Math.floor(rows.length / 10));
    for (let i = 0; i < rows.length; i += step) {
      console.log(`  ${rows[i].snapshotDate}  €${fmt(rows[i].totalEur)}`);
    }
    return;
  }

  // Upsert by date, in chunks to stay well within statement limits.
  const CHUNK = 200;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await db
      .insert(schema.netWorthSnapshots)
      .values(batch)
      .onConflictDoUpdate({
        target: schema.netWorthSnapshots.snapshotDate,
        set: {
          totalEur: sqlExcluded("total_eur"),
          personalEur: sqlExcluded("personal_eur"),
          investmentsEur: sqlExcluded("investments_eur"),
          accountsEur: sqlExcluded("accounts_eur"),
          loansEur: sqlExcluded("loans_eur"),
          propertiesEur: sqlExcluded("properties_eur"),
          updatedAt: new Date(),
        },
      });
    written += batch.length;
    process.stdout.write(`\r  written ${written}/${rows.length}`);
  }
  console.log(`\n✅ Backfill complete — ${written} snapshots upserted.`);
}

// Drizzle helper: reference the conflicting row's incoming value.
import { sql } from "drizzle-orm";
function sqlExcluded(col: string) {
  return sql.raw(`excluded.${col}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Backfill failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
