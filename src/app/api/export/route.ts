import { NextResponse } from "next/server";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { requireSession } from "@/lib/auth-actions";
import {
  accounts,
  transactions,
  realizedTrades,
  dividends,
  watchlist,
  priceAlerts,
  properties,
  propertyRent,
  propertyIncome,
  propertyLedger,
  loans,
  loanPayments,
  loanReceipts,
  businesses,
  businessLedger,
  clients,
  clientServices,
  cashflowIncome,
  cashflowExpense,
  incomeLegend,
  weddingItems,
  weddingGifts,
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click data export — downloads ALL of the owner's financial data as a JSON
 * file for backup or migration. Owner-session only. Deliberately excludes the
 * secret/system tables (owner, license, app_config, share_links) so the export
 * carries no credentials — just your data.
 */
const TABLES: Record<string, PgTable> = {
  accounts,
  transactions,
  realizedTrades,
  dividends,
  watchlist,
  priceAlerts,
  properties,
  propertyRent,
  propertyIncome,
  propertyLedger,
  loans,
  loanPayments,
  loanReceipts,
  businesses,
  businessLedger,
  clients,
  clientServices,
  cashflowIncome,
  cashflowExpense,
  incomeLegend,
  weddingItems,
  weddingGifts,
};

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const data: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(TABLES)) {
    try {
      data[name] = await db.select().from(table);
    } catch {
      data[name] = []; // table not migrated yet / empty — keep the export complete
    }
  }

  const payload = { app: "NomadWealth", version: 1, exportedAt: new Date().toISOString(), data };
  const filename = `nomadwealth-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
