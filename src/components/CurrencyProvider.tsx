"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CURRENCIES,
  FALLBACK_RATES,
  type Currency,
} from "@/config/fx";
import { formatMoney, formatPct, type MoneyOptions } from "@/lib/format";
import type { FxResponse } from "@/app/api/fx/route";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Currency, number>;
  asOf: Date | null;
  stale: boolean;
  loading: boolean;
  source: string;
  refresh: () => void;
  /** Convert an EUR amount to the active display currency. */
  convert: (eur: number) => number;
  /** Convert + format an EUR amount. */
  money: (eur: number, opts?: MoneyOptions) => string;
  pct: typeof formatPct;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "pid.currency";

export function CurrencyProvider({
  children,
  demo = false,
}: {
  children: React.ReactNode;
  /**
   * Sample-data walkthrough (/demo). Suppresses the "FX rates stale (fallback)"
   * warning: the figures are fabricated, so a fallback rate is not a data-quality
   * problem to flag — it just reads as broken on the sales demo. Real shared
   * portfolios (/share) keep the warning, since stale FX there is meaningful.
   */
  demo?: boolean;
}) {
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [stale, setStale] = useState(!demo);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(demo ? "sample" : "fallback");

  // Restore preferred currency
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (saved && CURRENCIES.includes(saved)) setCurrencyState(saved);
  }, []);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fx${force ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as FxResponse;
      setRates(data.rates);
      setAsOf(new Date(data.asOf));
      // In demo, a fallback rate is fine sample data — don't flag it as stale.
      setStale(demo ? false : data.stale);
      setSource(demo && data.stale ? "sample" : data.source);
    } catch {
      setRates(FALLBACK_RATES);
      setStale(!demo);
      setSource(demo ? "sample" : "fallback");
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    load(false);
  }, [load]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const convert = useCallback(
    (eur: number) => eur * (rates[currency] ?? 1),
    [rates, currency],
  );

  const money = useCallback(
    (eur: number, opts?: MoneyOptions) =>
      formatMoney(convert(eur), currency, opts),
    [convert, currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      rates,
      asOf,
      stale,
      loading,
      source,
      refresh: () => load(true),
      convert,
      money,
      pct: formatPct,
    }),
    [currency, setCurrency, rates, asOf, stale, loading, source, load, convert, money],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx)
    throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
