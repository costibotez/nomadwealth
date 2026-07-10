/**
 * OHLC candle history for the watchlist charts. Server-only.
 *  - Stocks (US + BVB): Yahoo Finance chart API.
 *  - Crypto: Coinbase Exchange public candles (keyless), e.g. BTC -> BTC-USD.
 *    (Binance 451s cloud IPs; CryptoCompare now requires an API key — both
 *    unusable keyless, which the self-host invariant requires.)
 */
import "server-only";
import { toYahooTicker } from "@/lib/prices";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export type CandleRange = "1D" | "1W" | "1M" | "1Y";

const YAHOO_RANGE: Record<CandleRange, { interval: string; range: string }> = {
  "1D": { interval: "5m", range: "1d" },
  "1W": { interval: "60m", range: "5d" },
  "1M": { interval: "1d", range: "1mo" },
  "1Y": { interval: "1d", range: "1y" },
};

// Coinbase Exchange candles: keyless, global (works from cloud IPs). Each range
// picks a granularity (seconds) + a look-back window. Coinbase caps a response
// at 300 candles, so 1Y (365 daily) is fetched in chunks and concatenated.
const COINBASE_GRANULARITY = { min5: 300, hour1: 3600, day1: 86400 } as const;
const CB_RANGE: Record<CandleRange, { granularity: number; spanSeconds: number }> = {
  "1D": { granularity: COINBASE_GRANULARITY.min5, spanSeconds: 1 * 86400 },
  "1W": { granularity: COINBASE_GRANULARITY.hour1, spanSeconds: 7 * 86400 },
  "1M": { granularity: COINBASE_GRANULARITY.day1, spanSeconds: 31 * 86400 },
  "1Y": { granularity: COINBASE_GRANULARITY.day1, spanSeconds: 365 * 86400 },
};
const CB_MAX_CANDLES = 300;

async function yahooCandles(ticker: string, range: CandleRange): Promise<Candle[]> {
  const { interval, range: r } = YAHOO_RANGE[range];
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${r}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; net-worth-dashboard/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        chart?: {
          result?: {
            timestamp?: number[];
            indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }[] };
          }[];
        };
      };
      const result = data.chart?.result?.[0];
      const ts = result?.timestamp;
      const q = result?.indicators?.quote?.[0];
      if (!ts || !q) continue;
      const out: Candle[] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        out.push({ time: ts[i], open: o, high: h, low: l, close: c });
      }
      if (out.length) return out;
    } catch {
      // next host
    }
  }
  return [];
}

// One Coinbase request (≤300 candles). Returns [time, low, high, open, close,
// volume] rows, newest first; we normalize to our Candle shape.
async function coinbaseChunk(
  product: string,
  granularity: number,
  startSec: number,
  endSec: number,
): Promise<Candle[]> {
  const url =
    `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles` +
    `?granularity=${granularity}&start=${new Date(startSec * 1000).toISOString()}` +
    `&end=${new Date(endSec * 1000).toISOString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; net-worth-dashboard/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as [number, number, number, number, number, number][];
  if (!Array.isArray(rows)) return [];
  return rows.map(([time, low, high, open, close]) => ({ time, open, high, low, close }));
}

async function coinbaseCandles(symbol: string, range: CandleRange): Promise<Candle[]> {
  // Normalize to a Coinbase product: accept bare tickers ("BTC") as well as
  // stored pairs ("BTC-USD", "BTCUSDT") by stripping any quote-currency suffix
  // before appending "-USD".
  const base = symbol.trim().toUpperCase().replace(/[-/]?(USDT|USD)$/, "");
  const product = `${base}-USD`;
  const { granularity, spanSeconds } = CB_RANGE[range];
  const now = Math.floor(Date.now() / 1000);
  const chunkSpan = granularity * CB_MAX_CANDLES;

  // Walk the window in ≤300-candle chunks (usually one; 1Y needs two).
  const chunks: Promise<Candle[]>[] = [];
  for (let end = now; end > now - spanSeconds; end -= chunkSpan) {
    const start = Math.max(end - chunkSpan, now - spanSeconds);
    chunks.push(coinbaseChunk(product, granularity, start, end));
  }

  try {
    const merged = (await Promise.all(chunks)).flat();
    // Dedupe by timestamp and sort ascending (lightweight-charts requires it).
    const byTime = new Map<number, Candle>();
    for (const c of merged) if (c.close > 0) byTime.set(c.time, c);
    return [...byTime.values()].sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}

export async function fetchCandles(symbol: string, assetClass: string, range: CandleRange): Promise<{ candles: Candle[]; source: string }> {
  if (assetClass === "crypto") {
    return { candles: await coinbaseCandles(symbol, range), source: "coinbase" };
  }
  const ticker = toYahooTicker(symbol, assetClass);
  if (!ticker) return { candles: [], source: "none" };
  return { candles: await yahooCandles(ticker, range), source: "yahoo" };
}
