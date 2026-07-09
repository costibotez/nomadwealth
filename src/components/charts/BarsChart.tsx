"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCurrency } from "@/components/CurrencyProvider";

export interface BarRow {
  label: string;
  income: number; // EUR
  expense: number; // EUR
}

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function IncomeExpenseBars({ data }: { data: BarRow[] }) {
  const { convert, money } = useCurrency();
  const chart = data.map((d) => ({
    label: d.label,
    Income: convert(d.income),
    Expenses: convert(d.expense),
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#808a99" strokeOpacity={0.22} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#5c6675" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#5c6675"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-raised px-3 py-2 text-xs shadow-card">
                  <div className="mb-1 font-medium">{label}</div>
                  {payload.map((p) => (
                    <div key={p.name} className="tnum flex justify-between gap-4 text-ink-muted">
                      <span style={{ color: p.color }}>{p.name}</span>
                      <span>{money(Number(p.value) / convert(1))}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Bar dataKey="Income" fill="#3ddc97" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="Expenses" fill="#ff5c5c" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { MONTHS };
