"use client";

import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { useCurrency } from "@/components/CurrencyProvider";
import { AnimatedMoney, Money } from "@/components/ui/money";
import { formatPct, deltaClass } from "@/lib/format";
import type { NetWorthChange } from "@/lib/networth-change";

export function HeroNetWorth({
  totalEur,
  personalEur,
  companyEur,
  change,
}: {
  totalEur: number;
  personalEur: number;
  companyEur: number;
  /** Net-worth change over a period, or null when there's no history yet. */
  change: NetWorthChange | null;
}) {
  const { asOf, stale, source } = useCurrency();
  const time = asOf
    ? asOf.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-raised p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative">
        <div className="stat-label">Net worth</div>
        <div className="mt-2">
          <AnimatedMoney
            eur={totalEur}
            className="text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {change && (
            <span className={`inline-flex items-center gap-1 ${deltaClass(change.eur)}`}>
              {change.eur >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <Money eur={change.eur} signed className="font-medium" />
              {change.pct != null && <span className="tnum">({formatPct(change.pct, { signed: true })})</span>}
              <span className="text-ink-faint">{change.label}</span>
            </span>
          )}
          <span className="text-ink-faint">
            {stale
              ? "FX rates stale (fallback)"
              : source === "sample"
                ? "Sample FX rates"
                : `FX live · as of ${time} · ${source}`}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-panel p-4">
            <div className="stat-label">Total net worth</div>
            <div className="mt-1 text-xl font-semibold">
              <Money eur={totalEur} />
            </div>
          </div>
          <div className="group relative rounded-xl border border-border bg-panel p-4">
            <div className="stat-label flex items-center gap-1">
              Personal net worth
              <Info size={12} className="text-ink-faint" />
            </div>
            <div className="mt-1 text-xl font-semibold">
              <Money eur={personalEur} />
            </div>
            <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-64 rounded-lg border border-border bg-raised p-2 text-xs text-ink-muted opacity-0 shadow-card transition group-hover:opacity-100">
              Excludes company cash (<Money eur={companyEur} compact />), which is
              pre-tax-distribution and not yet personally available.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
