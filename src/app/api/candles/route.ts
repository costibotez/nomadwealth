import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCandles, type CandleRange } from "@/lib/candles";

export const runtime = "nodejs";

const schema = z.object({
  symbol: z.string().min(1).max(64),
  assetClass: z.string().min(1).max(32),
  range: z.enum(["1D", "1W", "1M", "1Y"]).default("1M"),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse({
    symbol: url.searchParams.get("symbol"),
    assetClass: url.searchParams.get("assetClass"),
    range: url.searchParams.get("range") ?? "1M",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad params" }, { status: 400 });
  }
  const { symbol, assetClass, range } = parsed.data;
  const { candles, source } = await fetchCandles(symbol, assetClass, range as CandleRange);
  return NextResponse.json({ candles, source });
}
