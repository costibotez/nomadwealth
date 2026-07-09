"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCurrency } from "@/components/CurrencyProvider";

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  totalEur: number;
}

const RANGES = [
  { key: "1M", days: 31 },
  { key: "3M", days: 92 },
  { key: "YTD", days: null },
  { key: "1Y", days: 366 },
  { key: "All", days: Infinity },
] as const;

/**
 * Net-worth-over-time area chart. Reads the daily snapshot history (EUR) and
 * converts to the active display currency. Until a few days of snapshots have
 * accrued it shows a gentle empty state instead of a flat single dot.
 */
export function NetWorthTrend({ data }: { data: TrendPoint[] }) {
  const { convert, money } = useCurrency();
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("All");

  const filtered = filterByRange(data, range);
  const chart = filtered.map((d) => ({
    date: d.date,
    label: fmtTick(d.date),
    value: convert(d.totalEur),
  }));

  const first = filtered[0]?.totalEur ?? 0;
  const last = filtered[filtered.length - 1]?.totalEur ?? 0;
  const deltaEur = last - first;
  const deltaPct = first > 0 ? deltaEur / first : null;
  const up = deltaEur >= 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          {filtered.length >= 2 ? (
            <>
              <span className={`tnum text-sm font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
                {up ? "+" : ""}
                {money(deltaEur)}
              </span>
              {deltaPct != null && (
                <span className={`tnum text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
                  ({up ? "+" : ""}
                  {(deltaPct * 100).toFixed(1)}%)
                </span>
              )}
              <span className="text-xs text-muted">{spanLabel(filtered, range)}</span>
            </>
          ) : (
            <span className="text-xs text-muted">Trend builds as daily snapshots accrue</span>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                range === r.key ? "bg-raised text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      {filtered.length >= 2 ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff7a18" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ff7a18" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#808a99" strokeOpacity={0.22} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#5c6675" fontSize={11} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis
                stroke="#5c6675"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  return (
                    <div className="rounded-lg border border-border bg-raised px-3 py-2 text-xs shadow-card">
                      <div className="mb-1 font-medium">{p.payload.date}</div>
                      <div className="tnum">{money(Number(p.value) / convert(1))}</div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#ff7a18" fill="url(#gNw)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
          No history yet — your daily price-refresh job records one point per day.
        </div>
      )}
    </div>
  );
}

function filterByRange(data: TrendPoint[], key: string): TrendPoint[] {
  if (key === "YTD") {
    const y = new Date().getFullYear();
    return data.filter((d) => Number(d.date.slice(0, 4)) === y);
  }
  const r = RANGES.find((x) => x.key === key);
  if (!r || r.days == null || r.days === Infinity) return data;
  const cutoff = new Date(Date.now() - r.days * 86_400_000).toISOString().slice(0, 10);
  return data.filter((d) => d.date >= cutoff);
}

/**
 * Honest span label: shows the requested range, but if the data only covers a
 * shorter window (e.g. a few days of snapshots), reports the real span so the
 * header can't claim "over 3M" when it's really showing 2 days.
 */
function spanLabel(data: TrendPoint[], key: string): string {
  if (data.length < 2) return "";
  const first = data[0].date;
  const last = data[data.length - 1].date;
  const days = Math.round((Date.parse(last) - Date.parse(first)) / 86_400_000);
  const rangeDays = RANGES.find((r) => r.key === key)?.days;
  const rangeName = key === "All" ? "all time" : key;
  // If the data spans clearly less than the requested range, show the real span.
  if (rangeDays != null && rangeDays !== Infinity && days < rangeDays - 1) {
    return days <= 1 ? "over 1 day" : `over ${days} days`;
  }
  return `over ${rangeName}`;
}

function fmtTick(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${Number(d)}`;
}
