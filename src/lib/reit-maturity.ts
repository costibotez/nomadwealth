/**
 * Auto-close matured Crowdfunding REITs.
 *
 * StockEstate returns your capital + accrued interest at the end of each REIT's
 * term. We model that automatically: once a REIT lot is on/past its
 * `maturityDate`, this inserts a matching SELL transaction at the lot's current
 * accrued value (`current_price`, which already tracks principal + interest).
 *
 * Effect:
 *   - The sell nets the position quantity to zero, so the REIT drops off the
 *     Holdings → "Crowdfunding REIT" tab automatically (see aggregate.ts, which
 *     skips positions with remaining quantity ≈ 0).
 *   - The gain is booked as realized P/L (proceeds − cost), exactly like any
 *     other sell — no separate bookkeeping needed.
 *   - The payout (principal + accrued interest) is credited to the configured
 *     cash account (Wise Personal). Because the app does not track StockEstate's
 *     monthly interest payouts separately, we credit the FULL accrued value here
 *     — an asset→cash swap that keeps total net worth consistent.
 *
 * Idempotent: a position with no remaining quantity is already closed, so a
 * second run won't create a duplicate sell. Inserted rows are tagged via the
 * notes marker for traceability.
 *
 * Server-only. Called from the daily cron (api/cron/refresh-prices).
 */
import "server-only";
import { eq, sql, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { getTransactions } from "@/db/queries";
import { getFxRates } from "@/lib/fx-server";

export const REIT_MATURED_MARKER = "auto-matured-sell";

/** Cash account that receives matured REIT payouts. */
export const REIT_PAYOUT_ACCOUNT = "Wise Personal";

export interface ClosedReit {
  symbol: string;
  quantity: number;
  maturityDate: string;
  principalNative: number; // invested
  proceedsNative: number; // returned (principal + accrued interest)
  currency: string;
}

export async function processMaturedReits(
  today: string = new Date().toISOString().slice(0, 10),
): Promise<{ closed: ClosedReit[] }> {
  const txns = await getTransactions();

  // Group REIT lots per symbol so buys net against any prior sells.
  const bySymbol = new Map<string, typeof txns>();
  for (const t of txns) {
    if (t.assetClass !== "reit") continue;
    (bySymbol.get(t.symbol) ?? bySymbol.set(t.symbol, []).get(t.symbol)!).push(t);
  }

  const inserts: (typeof transactions.$inferInsert)[] = [];
  const closed: ClosedReit[] = [];

  for (const [symbol, lots] of bySymbol) {
    const buys = lots.filter((l) => l.direction === "buy");
    const sells = lots.filter((l) => l.direction === "sell");
    if (buys.length === 0) continue;

    const buyQty = buys.reduce((s, l) => s + l.quantity, 0);
    const sellQty = sells.reduce((s, l) => s + l.quantity, 0);
    const netQty = buyQty - sellQty;
    if (netQty <= 1e-9) continue; // already closed

    // Maturity = latest maturity date set on the open lots.
    const maturity = buys
      .map((b) => b.maturityDate)
      .filter((d): d is string => !!d)
      .sort()
      .pop();
    if (!maturity || maturity > today) continue; // not matured yet

    const ref = buys[buys.length - 1]; // representative lot (price/currency)
    const investedNative = buys.reduce((s, l) => s + l.quantity * l.unitCost, 0);
    const avgCost = buyQty > 0 ? investedNative / buyQty : 0;
    // Sell at the accrued value (principal + interest). Guard against an unset
    // current price so we never book a spurious loss — fall back to cost basis.
    const sellUnit = ref.currentPrice > avgCost ? ref.currentPrice : avgCost;
    const currency = ref.costCurrency || "EUR";

    inserts.push({
      tradeDate: maturity,
      direction: "sell",
      assetClass: "reit",
      symbol,
      quantity: String(netQty),
      unitCost: String(sellUnit),
      costCurrency: currency,
      currentPrice: String(ref.currentPrice),
      priceCurrency: ref.priceCurrency || "EUR",
      maturityDate: ref.maturityDate,
      notes: REIT_MATURED_MARKER,
    });
    closed.push({
      symbol,
      quantity: netQty,
      maturityDate: maturity,
      principalNative: avgCost * netQty,
      proceedsNative: sellUnit * netQty,
      currency,
    });
  }

  if (inserts.length === 0) return { closed };

  await db.insert(transactions).values(inserts);

  // Credit the payout (principal + accrued interest) to the cash account.
  // Convert each payout into the account's currency via EUR.
  const fx = await getFxRates();
  const acct = (
    await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.name, REIT_PAYOUT_ACCOUNT), isNull(accounts.deletedAt)))
      .limit(1)
  )[0];
  if (acct) {
    const eurToAcct = fx.rates[acct.currency as keyof typeof fx.rates] ?? 1;
    let creditAcct = 0;
    for (const c of closed) {
      const eurRate = fx.rates[c.currency as keyof typeof fx.rates] ?? 1; // EUR -> native
      const proceedsEur = c.proceedsNative / eurRate; // native -> EUR
      creditAcct += proceedsEur * eurToAcct; // EUR -> account currency
    }
    await db
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${creditAcct}`, updatedAt: new Date() })
      .where(eq(accounts.id, acct.id));
  }

  return { closed };
}
