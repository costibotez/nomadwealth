/**
 * Price-alert check (Vercel Cron). Fetches live prices only for the symbols that
 * have active alerts, then triggers + delivers via evaluateAndNotify. This is
 * what makes out-of-app alerts (push/email) work when no one has the watchlist
 * open — the in-app path only runs while that tab is visible.
 *
 * Secured by CRON_SECRET (Bearer) exactly like /api/cron/refresh-prices, and
 * listed in middleware PUBLIC_PATHS (via the /api/cron prefix) so the auth gate
 * doesn't redirect it. Schedule lives in vercel.json.
 */
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { priceAlerts } from "@/db/schema";
import { fetchLivePrices } from "@/lib/prices";
import { evaluateAndNotify } from "@/lib/notifications/evaluate";
import { checkMilestones } from "@/lib/notifications/milestones";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false; // fail closed if unset
  // Header-only: a ?key= fallback would land the secret in access logs and
  // browser history. Manual trigger: curl -H "Authorization: Bearer $CRON_SECRET".
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Distinct symbols across untriggered alerts (only these can newly trigger).
  const active = await db
    .select({ symbol: priceAlerts.symbol, assetClass: priceAlerts.assetClass })
    .from(priceAlerts)
    .where(and(isNull(priceAlerts.deletedAt), eq(priceAlerts.active, true), isNull(priceAlerts.triggeredAt)));

  const seen = new Set<string>();
  const items: { symbol: string; assetClass: string }[] = [];
  for (const a of active) {
    const key = `${a.assetClass}:${a.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ symbol: a.symbol, assetClass: a.assetClass });
  }

  const quotes =
    items.length > 0
      ? (await fetchLivePrices(items))
          .filter((q) => q.price != null)
          .map((q) => ({ symbol: q.symbol, assetClass: q.assetClass, price: q.price as number }))
      : [];

  const result = await evaluateAndNotify(quotes);

  // Piggyback: celebrate net-worth milestone crossings (once per threshold).
  let milestone: number | null = null;
  try {
    milestone = (await checkMilestones()).celebrated;
  } catch (err) {
    console.error("milestone check failed:", err);
  }

  return NextResponse.json({ ok: true, symbols: items.length, milestone, ...result });
}
