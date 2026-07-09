import { NextResponse } from "next/server";
import { getTransactions } from "@/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Distinct holding symbols that have a live source (stocks + crypto). */
export async function GET() {
  const txns = await getTransactions();
  const seen = new Set<string>();
  const items: { symbol: string; assetClass: string }[] = [];
  for (const t of txns) {
    if (t.assetClass !== "ro_stock" && t.assetClass !== "us_stock" && t.assetClass !== "crypto") continue;
    const k = `${t.assetClass}:${t.symbol}`;
    if (seen.has(k)) continue;
    seen.add(k);
    items.push({ symbol: t.symbol, assetClass: t.assetClass });
  }
  return NextResponse.json({ items });
}
