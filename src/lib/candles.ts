/**
 * OHLC candle history for the watchlist charts. Server-only.
 *  - Stocks (US + BVB): Yahoo Finance chart API.
 *  - Crypto: Binance public klines (keyless), e.g. BTC -> BTCUSDT.
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

// CryptoCompare is global + keyless (Binance geo-blocks US/Vercel IPs with 451).
const CC_RANGE: Record<CandleRange, { endpoint: "histominute" | "histohour" | "histoday"; aggregate: number; limit: number }> = {
  "1D": { endpoint: "histominute", aggregate: 5, limit: 288 },
  "1W": { endpoint: "histohour", aggregate: 1, limit: 168 },
  "1M": { endpoint: "histoday", aggregate: 1, limit: 31 },
  "1Y": { endpoint: "histoday", aggregate: 1, limit: 365 },
};

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

async function cryptoCompareCandles(symbol: string, range: CandleRange): Promise<Candle[]> {
  const { endpoint, aggregate, limit } = CC_RANGE[range];
  const fsym = symbol.trim().toUpperCase();
  try {
    const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${encodeURIComponent(fsym)}&tsym=USD&limit=${limit}&aggregate=${aggregate}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      Response?: string;
      Data?: { Data?: { time: number; open: number; high: number; low: number; close: number }[] };
    };
    if (json.Response && json.Response !== "Success") return [];
    const rows = json.Data?.Data ?? [];
    return rows
      .filter((r) => r.open > 0 || r.close > 0)
      .map((r) => ({ time: r.time, open: r.open, high: r.high, low: r.low, close: r.close }));
  } catch {
    return [];
  }
}

export async function fetchCandles(symbol: string, assetClass: string, range: CandleRange): Promise<{ candles: Candle[]; source: string }> {
  if (assetClass === "crypto") {
    return { candles: await cryptoCompareCandles(symbol, range), source: "cryptocompare" };
  }
  const ticker = toYahooTicker(symbol, assetClass);
  if (!ticker) return { candles: [], source: "none" };
  return { candles: await yahooCandles(ticker, range), source: "yahoo" };
}
