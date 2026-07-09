"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useCurrency } from "@/components/CurrencyProvider";
import { PALETTE } from "./palette";

export interface DonutSlice {
  name: string;
  eur: number;
  color?: string;
}

export function Donut({
  data,
  centerLabel,
}: {
  data: DonutSlice[];
  centerLabel?: string;
}) {
  const { money, convert } = useCurrency();
  const total = data.reduce((s, d) => s + d.eur, 0);
  const chartData = data.map((d, i) => ({
    ...d,
    value: Math.max(0, convert(d.eur)),
    fill: d.color ?? PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
            animationDuration={600}
          >
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as DonutSlice & { value: number };
              const pct = total ? (p.eur / total) * 100 : 0;
              return (
                <div className="rounded-lg border border-border bg-raised px-3 py-2 text-xs shadow-card">
                  <div className="font-medium">{p.name}</div>
                  <div className="tnum text-ink-muted">
                    {money(p.eur)} · {pct.toFixed(1)}%
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat-label">{centerLabel ?? "Total"}</span>
        <span className="tnum mt-0.5 text-lg font-semibold">{money(total, { compact: true })}</span>
      </div>
    </div>
  );
}

export function Legend({ data }: { data: DonutSlice[] }) {
  const { money } = useCurrency();
  const total = data.reduce((s, d) => s + d.eur, 0);
  return (
    <ul className="space-y-1.5">
      {data.map((d, i) => (
        <li key={d.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-ink-muted">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: d.color ?? PALETTE[i % PALETTE.length] }}
            />
            {d.name}
          </span>
          <span className="tnum text-ink-faint">
            {total ? ((d.eur / total) * 100).toFixed(1) : "0"}%
          </span>
        </li>
      ))}
    </ul>
  );
}
