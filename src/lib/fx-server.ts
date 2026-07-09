/**
 * Server-side FX fetching with a 60-minute in-memory cache.
 * Used by both /api/fx (for the client switcher) and the aggregation layer
 * (to convert each row's native currency into the canonical EUR).
 */
import "server-only";
import { env } from "@/lib/env";
import { CURRENCIES, FALLBACK_RATES, type Currency } from "@/config/fx";

export interface FxData {
  base: "EUR";
  rates: Record<Currency, number>; // EUR -> X
  asOf: string;
  fetchedAt: string;
  stale: boolean;
  source: string;
}

let cache: { value: FxData; expires: number } | null = null;
const TTL_MS = 60 * 60 * 1000;
const QUOTES = CURRENCIES.filter((c) => c !== "EUR");

async function fromFrankfurter(): Promise<FxData | null> {
  try {
    const url = `${env.FX_PROVIDER_URL}?from=EUR&to=${QUOTES.join(",")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { date: string; rates: Record<string, number> };
    const rates: Record<Currency, number> = { ...FALLBACK_RATES, EUR: 1 };
    for (const q of QUOTES) if (typeof data.rates?.[q] === "number") rates[q] = data.rates[q];
    return {
      base: "EUR",
      rates,
      asOf: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      stale: false,
      source: "frankfurter.app",
    };
  } catch {
    return null;
  }
}

async function fromExchangerateHost(): Promise<FxData | null> {
  try {
    const url = `https://api.exchangerate.host/latest?base=EUR&symbols=${QUOTES.join(",")}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { date?: string; rates: Record<string, number> };
    if (!data.rates) return null;
    const rates: Record<Currency, number> = { ...FALLBACK_RATES, EUR: 1 };
    for (const q of QUOTES) if (typeof data.rates[q] === "number") rates[q] = data.rates[q];
    return {
      base: "EUR",
      rates,
      asOf: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      stale: false,
      source: "exchangerate.host",
    };
  } catch {
    return null;
  }
}

function fallback(): FxData {
  return {
    base: "EUR",
    rates: { ...FALLBACK_RATES },
    asOf: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    stale: true,
    source: "fallback",
  };
}

export async function getFxRates(force = false): Promise<FxData> {
  if (!force && cache && cache.expires > Date.now()) return cache.value;
  const value = (await fromFrankfurter()) ?? (await fromExchangerateHost()) ?? fallback();
  cache = { value, expires: Date.now() + (value.stale ? 5 * 60 * 1000 : TTL_MS) };
  return value;
}

/** Convert a native amount to EUR using EUR->X rates (1 X = 1/rate EUR). */
export function toEur(amount: number, currency: string, rates: Record<Currency, number>): number {
  const c = currency.toUpperCase() as Currency;
  const rate = rates[c];
  if (!rate || rate === 0) return amount; // unknown currency: assume already EUR
  return amount / rate;
}
