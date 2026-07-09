"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/components/CurrencyProvider";
import { formatPct, deltaClass, type MoneyOptions } from "@/lib/format";

/** Render an EUR amount in the active display currency. */
export function Money({
  eur,
  compact,
  signed,
  decimals,
  className = "",
}: {
  eur: number;
  compact?: boolean;
  signed?: boolean;
  decimals?: number;
  className?: string;
}) {
  const { money } = useCurrency();
  const opts: MoneyOptions = { compact, signed, decimals };
  return <span className={`tnum ${className}`}>{money(eur, opts)}</span>;
}

/** Coloured P/L value (EUR) with sign. */
export function MoneyDelta({ eur, compact }: { eur: number; compact?: boolean }) {
  const { money } = useCurrency();
  return (
    <span className={`tnum ${deltaClass(eur)}`}>
      {money(eur, { compact, signed: true })}
    </span>
  );
}

export function Pct({
  value,
  signed = true,
  colored = true,
}: {
  value: number | null | undefined;
  signed?: boolean;
  colored?: boolean;
}) {
  const cls = colored && value != null ? deltaClass(value) : "text-ink-muted";
  return <span className={`tnum ${cls}`}>{formatPct(value, { signed })}</span>;
}

/**
 * Hero net-worth figure: counts up on mount and re-tweens when the value (or
 * currency) changes. Tabular figures keep the width stable.
 */
export function AnimatedMoney({
  eur,
  className = "",
}: {
  eur: number;
  className?: string;
}) {
  const { convert, currency, money } = useCurrency();
  const target = convert(eur);
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const dur = 450;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
    // re-run when target or currency changes
  }, [target, currency]);

  // money() formats an EUR amount; we already converted, so reverse via 0-safe:
  // simplest is to format the displayed (converted) number using the same rules.
  void money;
  return (
    <span className={`tnum ${className}`}>
      {formatConverted(display, currency)}
    </span>
  );
}

import { CURRENCY_META, type Currency } from "@/config/fx";
function formatConverted(amount: number, currency: Currency): string {
  const meta = CURRENCY_META[currency];
  const body = Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const s = meta.symbolAfter ? `${body} ${meta.symbol}` : `${meta.symbol}${body}`;
  return amount < 0 ? `(${s})` : s;
}
