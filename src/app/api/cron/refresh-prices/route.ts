/**
 * Daily live-price refresh (Vercel Cron). Fetches live prices for every distinct
 * stock/crypto symbol and writes them to `current_price` in Neon.
 *
 * Secured by CRON_SECRET: Vercel Cron automatically sends
 *   Authorization: Bearer <CRON_SECRET>
 * when that env var is set. We reject anything else. This route is also listed
 * in middleware's PUBLIC_PATHS so the auth gate doesn't redirect the cron.
 *
 * Schedule is configured in vercel.json (default 05:00 UTC ≈ early morning RO).
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { getTransactions, getWatchlist, upsertNetWorthSnapshot } from "@/db/queries";
import { getNetWorthModel } from "@/lib/aggregate";
import { fetchLivePrices } from "@/lib/prices";
import { processMaturedReits } from "@/lib/reit-maturity";
import { checkAlerts } from "@/app/actions";
import { cronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [txns, watch] = await Promise.all([getTransactions(), getWatchlist()]);
  const live = (c: string) => c === "ro_stock" || c === "us_stock" || c === "crypto";
  // Distinct symbol + class across holdings AND the watchlist.
  const seen = new Set<string>();
  const items: { symbol: string; assetClass: string }[] = [];
  for (const t of [...txns, ...watch]) {
    if (!live(t.assetClass)) continue;
    const k = `${t.assetClass}:${t.symbol}`;
    if (seen.has(k)) continue;
    seen.add(k);
    items.push({ symbol: t.symbol, assetClass: t.assetClass });
  }

  const quotes = await fetchLivePrices(items);

  // Evaluate price alerts against the fresh quotes (in-app notification).
  const alertResult = await checkAlerts(
    quotes.filter((q) => q.price != null).map((q) => ({ symbol: q.symbol, assetClass: q.assetClass, price: q.price as number })),
  );

  let updated = 0;
  const failed: string[] = [];
  for (const q of quotes) {
    if (q.price != null && isFinite(q.price)) {
      await db
        .update(transactions)
        .set({ currentPrice: String(q.price), updatedAt: new Date() })
        .where(
          sql`${transactions.symbol} = ${q.symbol} AND ${transactions.assetClass} = ${q.assetClass} AND ${transactions.deletedAt} IS NULL`,
        );
      updated++;
    } else {
      failed.push(`${q.symbol} (${q.error ?? "no price"})`);
    }
  }

  // Auto-close any Crowdfunding REIT that has reached its maturity date:
  // StockEstate returns capital + accrued interest, so we insert a matching sell
  // at the lot's accrued value. The position then drops off the REIT tab and the
  // gain is booked as realized P/L. Runs before the snapshot so it's reflected.
  let reitsClosed: string[] = [];
  try {
    const { closed } = await processMaturedReits();
    reitsClosed = closed.map((c) => c.symbol);
  } catch (e) {
    failed.push(`reit-maturity (${e instanceof Error ? e.message : "failed"})`);
  }

  // Record today's net-worth snapshot (recomputed from the fresh prices), so the
  // Overview can chart the trend over time. Upserts by date — safe to re-run.
  let snapshotEur: number | null = null;
  try {
    const nw = await getNetWorthModel();
    await upsertNetWorthSnapshot({
      snapshotDate: new Date().toISOString().slice(0, 10),
      totalEur: nw.totalNetWorthEur,
      personalEur: nw.personalNetWorthEur,
      investmentsEur: nw.components.investmentsEur,
      accountsEur: nw.components.accountsEur,
      loansEur: nw.components.loansEur,
      propertiesEur: nw.components.propertiesEur,
      businessesEur: nw.components.businessesEur,
    });
    snapshotEur = nw.totalNetWorthEur;
  } catch (e) {
    failed.push(`snapshot (${e instanceof Error ? e.message : "failed"})`);
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    symbols: items.length,
    updated,
    failed,
    alertsTriggered: alertResult.triggered.length,
    reitsClosed,
    snapshotEur,
  });
}
