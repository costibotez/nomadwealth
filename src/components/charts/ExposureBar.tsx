"use client";

import { useCurrency } from "@/components/CurrencyProvider";

export interface ExposureSeg {
  label: string;
  eur: number;
  color: string;
}

/** A single horizontal stacked bar (currency / geography exposure). */
export function ExposureBar({ data }: { data: ExposureSeg[] }) {
  const { money } = useCurrency();
  const total = data.reduce((s, d) => s + Math.max(0, d.eur), 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-panel">
        {data.map((d) => (
          <div
            key={d.label}
            style={{ width: `${(Math.max(0, d.eur) / total) * 100}%`, background: d.color }}
            title={`${d.label}: ${((d.eur / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {data.map((d) => (
          <li key={d.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="tnum text-ink-faint">{money(d.eur, { compact: true })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
