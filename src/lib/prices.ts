/**
 * Live price fetching for the "Fetch live prices" action. Server-only.
 *
 *  - Stocks (US + Bucharest/BVB): Yahoo Finance chart API (keyless). BVB tickers
 *    map to the `.RO` suffix (e.g. BVB:TLV -> TLV.RO) and return prices in RON;
 *    US tickers return USD. This matches how each lot is stored, so the returned
 *    price drops straight into `current_price` with no conversion.
 *  - Crypto: CoinMarketCap (needs CMC_API_KEY), returns USD.
 *  - REITs, mutual funds, gold, other: no live source — left for manual entry.
 *
 * SEAM: to add another provider (e.g. a BVB-specific feed or live FX-priced
 * assets), add a branch in `fetchLivePrices` keyed by asset class.
 */
import "server-only";
import { env } from "@/lib/env";

export interface PriceQuote {
  key: string; // `${assetClass}:${symbol}`
  symbol: string;
  assetClass: string;
  price: number | null;
  currency: string | null;
  changePct: number | null; // day (stocks) / 24h (crypto) change ratio
  source: string;
  error?: string;
}

export interface PriceRequestItem {
  symbol: string;
  assetClass: string;
}

/**
 * Overrides where your sheet's symbol differs from Yahoo's ticker.
 * e.g. Hidroelectrica is "H20" in the sheet but "H2O.RO" on Yahoo.
 */
const YAHOO_RO_OVERRIDES: Record<string, string> = {
  H20: "H2O",
};

/** BVB:TLV -> TLV.RO ; plain US ticker stays as-is. */
export function toYahooTicker(symbol: string, assetClass: string): string | null {
  if (assetClass === "ro_stock") {
    const base = symbol.replace(/^BVB:/i, "").trim().toUpperCase();
    return `${YAHOO_RO_OVERRIDES[base] ?? base}.RO`;
  }
  if (assetClass === "us_stock") {
    return symbol.trim().toUpperCase();
  }
  return null;
}

async function yahooQuote(ticker: string): Promise<{ price: number; currency: string; changePct: number | null } | null> {
  const hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; net-worth-dashboard/1.0)" },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        chart?: { result?: { meta?: { regularMarketPrice?: number; currency?: string; previousClose?: number; chartPreviousClose?: number } }[] };
      };
      const meta = data.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice != null) {
        let price = meta.regularMarketPrice;
        let currency = meta.currency ?? "USD";
        const prev = meta.previousClose ?? meta.chartPreviousClose ?? null;
        if (currency === "GBp") {
          price = price / 100;
          currency = "GBP";
        }
        const changePct = prev && prev > 0 ? (meta.regularMarketPrice - prev) / prev : null;
        return { price, currency: currency.toUpperCase(), changePct };
      }
    } catch {
      // try next host
    }
  }
  return null;
}

async function cmcQuotes(symbols: string[]): Promise<Record<string, { price: number; changePct: number | null }>> {
  if (!env.CMC_API_KEY || symbols.length === 0) return {};
  try {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(",")}&convert=USD`;
    const res = await fetch(url, {
      headers: { "X-CMC_PRO_API_KEY": env.CMC_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    type Node = { quote?: { USD?: { price?: number; percent_change_24h?: number } } };
    const json = (await res.json()) as { data?: Record<string, Node | Node[]> };
    const out: Record<string, { price: number; changePct: number | null }> = {};
    for (const sym of symbols) {
      const entry = json.data?.[sym];
      const node = Array.isArray(entry) ? entry[0] : entry;
      const price = node?.quote?.USD?.price;
      if (typeof price === "number") {
        const pc = node?.quote?.USD?.percent_change_24h;
        out[sym.toUpperCase()] = { price, changePct: typeof pc === "number" ? pc / 100 : null };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function fetchLivePrices(items: PriceRequestItem[]): Promise<PriceQuote[]> {
  const cryptoSymbols = [
    ...new Set(items.filter((i) => i.assetClass === "crypto").map((i) => i.symbol.toUpperCase())),
  ];
  const cryptoPrices = await cmcQuotes(cryptoSymbols);

  return Promise.all(
    items.map(async (i): Promise<PriceQuote> => {
      const key = `${i.assetClass}:${i.symbol}`;
      if (i.assetClass === "crypto") {
        const c = cryptoPrices[i.symbol.toUpperCase()];
        return c != null
          ? { key, symbol: i.symbol, assetClass: i.assetClass, price: c.price, currency: "USD", changePct: c.changePct, source: "coinmarketcap" }
          : {
              key,
              symbol: i.symbol,
              assetClass: i.assetClass,
              price: null,
              currency: null,
              changePct: null,
              source: "coinmarketcap",
              error: env.CMC_API_KEY ? "not found" : "CMC_API_KEY not set",
            };
      }
      const ticker = toYahooTicker(i.symbol, i.assetClass);
      if (!ticker) {
        return { key, symbol: i.symbol, assetClass: i.assetClass, price: null, currency: null, changePct: null, source: "none", error: "no live source" };
      }
      const q = await yahooQuote(ticker);
      return q
        ? { key, symbol: i.symbol, assetClass: i.assetClass, price: q.price, currency: q.currency, changePct: q.changePct, source: "yahoo" }
        : { key, symbol: i.symbol, assetClass: i.assetClass, price: null, currency: null, changePct: null, source: "yahoo", error: "fetch failed" };
    }),
  );
}
