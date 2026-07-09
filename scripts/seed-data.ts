/**
 * Seeds the data that is NOT in either spreadsheet (§7): cash accounts and the
 * StockEstate / Roland loans. Idempotent: clears the relevant rows then inserts.
 * Roland's loan ALSO appears in the holdings summary (~$17,160) — we import it
 * here as the single source row and do NOT double-count it in properties.
 */
import { db, schema } from "./db";
import { sql } from "drizzle-orm";

export interface SeedSummary {
  accounts: number;
  extraLoans: number;
}

const ACCOUNTS: Array<typeof schema.accounts.$inferInsert> = [
  { name: "Ledger", type: "crypto", balance: "14000", currency: "USD" },
  { name: "Robinhood", type: "crypto", balance: "7000", currency: "EUR" },
  { name: "Wise Firma", type: "company_cash", balance: "35000", currency: "EUR", isCompany: true },
  { name: "Wise Personal", type: "personal_cash", balance: "6000", currency: "EUR" },
  { name: "Savings", type: "savings", balance: "5000", currency: "EUR" },
];

// StockEstate + Roland — rates left at 0 for you to set in the UI.
const EXTRA_LOANS: Array<typeof schema.loans.$inferInsert> = [
  {
    borrower: "StockEstate",
    principal: "27000",
    currency: "EUR",
    backed: "property",
    interestRate: "0",
    compounding: "simple",
    status: "active",
    notes: "Set interest rate / term in the UI.",
  },
  {
    borrower: "Roland",
    principal: "12000",
    currency: "EUR",
    backed: "business",
    interestRate: "0",
    compounding: "simple",
    status: "active",
    notes: "Set interest rate / term in the UI. (Shows as ~$17,160 current value in the holdings summary.)",
  },
];

export async function seedExtras(): Promise<SeedSummary> {
  // Clear only the seeded (non-Dan) loans + all accounts so re-runs stay clean.
  await db.delete(schema.accounts);
  await db.execute(
    sql`DELETE FROM loans WHERE borrower IN ('StockEstate','Roland')`,
  );

  await db.insert(schema.accounts).values(ACCOUNTS);
  await db.insert(schema.loans).values(EXTRA_LOANS);

  return { accounts: ACCOUNTS.length, extraLoans: EXTRA_LOANS.length };
}
