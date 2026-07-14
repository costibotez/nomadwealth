/**
 * User-facing sample data for first-run onboarding.
 *
 * "Load sample data" seeds a small, obviously-fictional portfolio into the
 * buyer's OWN database so the dashboard demonstrates itself with something to
 * look at. Every inserted row id is recorded in `sample_rows`, so "Clear
 * sample data" removes exactly what was seeded (hard delete — these rows never
 * belonged to the user) and nothing else. The user's real rows are untouched
 * either way, so it is safe to mix sample data with early real entries.
 */
import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  loans,
  properties,
  sampleRows,
  transactions,
} from "@/db/schema";

const SAMPLE_NOTE = "Sample data — remove via “Clear sample data”.";

export async function hasSampleData(): Promise<boolean> {
  const rows = await db.select({ id: sampleRows.id }).from(sampleRows).limit(1);
  return rows.length > 0;
}

export async function loadSampleData(): Promise<{ inserted: number }> {
  if (await hasSampleData()) return { inserted: 0 }; // idempotent

  const record: { tableName: string; rowId: number }[] = [];

  const insertedAccounts = await db
    .insert(accounts)
    .values([
      { name: "Sample checking", type: "personal_cash", balance: "8500", currency: "EUR", notes: SAMPLE_NOTE },
      { name: "Sample savings", type: "savings", balance: "12000", currency: "EUR", notes: SAMPLE_NOTE },
      { name: "Sample cold wallet", type: "crypto", balance: "4000", currency: "USD", notes: SAMPLE_NOTE },
    ])
    .returning({ id: accounts.id });
  record.push(...insertedAccounts.map((r) => ({ tableName: "accounts", rowId: r.id })));

  const insertedTxns = await db
    .insert(transactions)
    .values([
      { tradeDate: "2024-03-11", direction: "buy", assetClass: "us_stock", symbol: "AAPL", quantity: "12", unitCost: "168.40", costCurrency: "USD", currentPrice: "168.40", priceCurrency: "USD", notes: SAMPLE_NOTE },
      { tradeDate: "2024-06-02", direction: "buy", assetClass: "us_stock", symbol: "MSFT", quantity: "6", unitCost: "412.30", costCurrency: "USD", currentPrice: "412.30", priceCurrency: "USD", notes: SAMPLE_NOTE },
      { tradeDate: "2024-09-18", direction: "buy", assetClass: "us_stock", symbol: "VOO", quantity: "10", unitCost: "478.10", costCurrency: "USD", currentPrice: "478.10", priceCurrency: "USD", notes: SAMPLE_NOTE },
      { tradeDate: "2024-05-20", direction: "buy", assetClass: "crypto", symbol: "BTC", quantity: "0.08", unitCost: "61200", costCurrency: "USD", currentPrice: "61200", priceCurrency: "USD", notes: SAMPLE_NOTE },
      { tradeDate: "2024-08-07", direction: "buy", assetClass: "crypto", symbol: "ETH", quantity: "1.5", unitCost: "2950", costCurrency: "USD", currentPrice: "2950", priceCurrency: "USD", notes: SAMPLE_NOTE },
      { tradeDate: "2024-11-25", direction: "buy", assetClass: "gold", symbol: "XAU", quantity: "2", unitCost: "2410", costCurrency: "USD", currentPrice: "2410", priceCurrency: "USD", notes: SAMPLE_NOTE },
    ])
    .returning({ id: transactions.id });
  record.push(...insertedTxns.map((r) => ({ tableName: "transactions", rowId: r.id })));

  const insertedProps = await db
    .insert(properties)
    .values([
      {
        name: "Sample apartment (city center)",
        value: "145000",
        currency: "EUR",
        monthlyRent: "650",
        isRented: true,
        purchaseDate: "2022-04-01",
        purchasePrice: "118000",
        notes: SAMPLE_NOTE,
      },
    ])
    .returning({ id: properties.id });
  record.push(...insertedProps.map((r) => ({ tableName: "properties", rowId: r.id })));

  const insertedLoans = await db
    .insert(loans)
    .values([
      {
        borrower: "Sample private loan",
        principal: "10000",
        currency: "EUR",
        backed: "property",
        startDate: "2024-01-15",
        interestRate: "6",
        compounding: "simple",
        termMonths: 36,
        status: "active",
        notes: SAMPLE_NOTE,
      },
    ])
    .returning({ id: loans.id });
  record.push(...insertedLoans.map((r) => ({ tableName: "loans", rowId: r.id })));

  await db.insert(sampleRows).values(record);
  return { inserted: record.length };
}

export async function clearSampleData(): Promise<{ removed: number }> {
  const rows = await db.select().from(sampleRows);
  if (rows.length === 0) return { removed: 0 };

  const byTable = new Map<string, number[]>();
  for (const r of rows) {
    byTable.set(r.tableName, [...(byTable.get(r.tableName) ?? []), r.rowId]);
  }

  // Hard delete — sample rows were never the user's data, so they should not
  // linger in /trash. Order doesn't matter: no FKs point at these rows.
  const tables = {
    accounts,
    transactions,
    properties,
    loans,
  } as const;
  for (const [name, ids] of byTable) {
    const table = tables[name as keyof typeof tables];
    if (!table) continue;
    await db.delete(table).where(inArray(table.id, ids));
  }
  await db.delete(sampleRows);
  return { removed: rows.length };
}
