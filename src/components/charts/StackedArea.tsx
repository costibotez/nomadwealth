"use client";

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

export interface ProjRow {
  year: number;
  financial: number; // EUR
  property: number; // EUR
}

export function ProjectionArea({ data, baseYear }: { data: ProjRow[]; baseYear: number }) {
  const { convert, money } = useCurrency();
  const chart = data.map((d) => ({
    year: baseYear + d.year,
    Financial: convert(d.financial),
    Property: convert(d.property),
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gFin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff7a18" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#ff7a18" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gProp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b8def" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#5b8def" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#808a99" strokeOpacity={0.22} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" stroke="#5c6675" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#5c6675"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const total = payload.reduce((s, p) => s + Number(p.value), 0);
              return (
                <div className="rounded-lg border border-border bg-raised px-3 py-2 text-xs shadow-card">
                  <div className="mb-1 font-medium">{label}</div>
                  {payload.map((p) => (
                    <div key={p.name} className="tnum flex justify-between gap-4">
                      <span style={{ color: p.color }}>{p.name}</span>
                      <span>{money(Number(p.value) / convert(1))}</span>
                    </div>
                  ))}
                  <div className="tnum mt-1 flex justify-between gap-4 border-t border-border pt-1 font-medium">
                    <span>Total</span>
                    <span>{money(total / convert(1))}</span>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="Property"
            stackId="1"
            stroke="#5b8def"
            fill="url(#gProp)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="Financial"
            stackId="1"
            stroke="#ff7a18"
            fill="url(#gFin)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
