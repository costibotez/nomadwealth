"use client";

import { useState, useRef, useEffect } from "react";
import { Check, RefreshCw, ChevronDown } from "lucide-react";
import { CURRENCIES, CURRENCY_META, type Currency } from "@/config/fx";
import { useCurrency } from "./CurrencyProvider";

export function CurrencySwitcher() {
  const { currency, setCurrency, asOf, stale, loading, source, refresh } = useCurrency();
  const sample = source === "sample";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const time = asOf
    ? asOf.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="focusring flex items-center gap-2 rounded-xl border border-border bg-panel px-3 py-1.5 text-sm hover:bg-hover"
      >
        <span className="font-medium">{CURRENCY_META[currency].code}</span>
        <span className="hidden text-xs text-ink-faint sm:inline">
          {stale ? "rates stale" : sample ? "sample rates" : `FX ${time}`}
        </span>
        {stale && (
          <span className="h-1.5 w-1.5 rounded-full bg-loss" title="Using fallback rates" />
        )}
        <ChevronDown size={14} className="text-ink-faint" />
      </button>

      <button
        onClick={refresh}
        title="Refresh FX rates"
        className="focusring rounded-xl border border-border bg-panel p-2 text-ink-faint hover:bg-hover hover:text-ink"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 animate-fade-up rounded-xl border border-border bg-raised p-1 shadow-card">
          {CURRENCIES.map((c: Currency) => (
            <button
              key={c}
              onClick={() => {
                setCurrency(c);
                setOpen(false);
              }}
              className="focusring flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-hover"
            >
              <span>
                <span className="font-medium">{CURRENCY_META[c].code}</span>{" "}
                <span className="text-ink-faint">{CURRENCY_META[c].symbol}</span>
              </span>
              {c === currency && <Check size={15} className="text-accent" />}
            </button>
          ))}
          <div className="border-t border-border px-3 py-2 text-[11px] text-ink-faint">
            {stale ? "Live FX unavailable — fallback" : sample ? "Sample rates for demo" : `Live, as of ${time}`}
          </div>
        </div>
      )}
    </div>
  );
}
