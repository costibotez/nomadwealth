"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, PageGrid, StatCard } from "@/components/ui/primitives";
import { Money } from "@/components/ui/money";
import { ProjectionArea } from "@/components/charts/StackedArea";
import { projectNetWorth } from "@/lib/finance";

export function ProjectionClient({
  startFinancialEur,
  startPropertyEur,
  baseYear,
}: {
  startFinancialEur: number;
  startPropertyEur: number;
  baseYear: number;
}) {
  const [monthly, setMonthly] = useState(1500);
  const [ret, setRet] = useState(7);
  const [propGrowth, setPropGrowth] = useState(3);
  const [years, setYears] = useState(20);

  const points = useMemo(
    () =>
      projectNetWorth({
        startingFinancial: startFinancialEur,
        startingProperty: startPropertyEur,
        monthlyContribution: monthly,
        annualReturnPct: ret,
        propertyGrowthPct: propGrowth,
        years,
      }),
    [startFinancialEur, startPropertyEur, monthly, ret, propGrowth, years],
  );

  const final = points[points.length - 1];
  const today = points[0].total;
  const multiple = today ? final.total / today : 0;

  // Savings-rate sensitivity at 10 years
  const sensitivity = [0, 500, 1000, 1500, 2000, 3000].map((m) => {
    const p = projectNetWorth({
      startingFinancial: startFinancialEur,
      startingProperty: startPropertyEur,
      monthlyContribution: m,
      annualReturnPct: ret,
      propertyGrowthPct: propGrowth,
      years: 10,
    });
    return { monthly: m, total: p[p.length - 1].total };
  });

  return (
    <PageGrid>
      <Card>
        <SectionTitle>Assumptions</SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Slider label="Monthly contribution" value={monthly} min={0} max={5000} step={100} onChange={setMonthly} suffix="€/mo" />
          <Slider label="Expected return" value={ret} min={0} max={15} step={0.5} onChange={setRet} suffix="%" />
          <Slider label="Property growth" value={propGrowth} min={0} max={10} step={0.5} onChange={setPropGrowth} suffix="%" />
          <Slider label="Years" value={years} min={5} max={40} step={1} onChange={setYears} suffix="yr" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Net worth in ${baseYear + years}`} value={<Money eur={final.total} />} />
        <StatCard label="Multiple of today" value={<span className="tnum">{multiple.toFixed(1)}×</span>} />
        <StatCard label="Total contributed" value={<Money eur={final.contributed} compact />} />
        <StatCard label="Financial vs property" value={<span className="text-sm"><Money eur={final.financial} compact /> / <Money eur={final.property} compact /></span>} />
      </div>

      <Card>
        <SectionTitle>Projected trajectory (property vs financial)</SectionTitle>
        <ProjectionArea data={points.map((p) => ({ year: p.year, financial: p.financial, property: p.property }))} baseYear={baseYear} />
      </Card>

      <Card>
        <SectionTitle>Savings-rate sensitivity (10-year net worth)</SectionTitle>
        <p className="mb-3 text-xs text-ink-faint">
          Contribution rate dominates returns over a decade — compare the 10-year figure as monthly savings varies.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-faint">
              <th className="py-2 font-medium">Monthly</th>
              <th className="py-2 text-right font-medium">Net worth in {baseYear + 10}</th>
            </tr>
          </thead>
          <tbody>
            {sensitivity.map((s) => (
              <tr key={s.monthly} className={`border-b border-border/50 ${s.monthly === monthly ? "bg-accent-soft" : ""}`}>
                <td className="tnum py-2">€{s.monthly}/mo</td>
                <td className="py-2 text-right"><Money eur={s.total} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageGrid>
  );
}

function Slider({
  label, value, min, max, step, onChange, suffix,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; suffix: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span className="tnum text-sm text-accent">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-accent" />
    </div>
  );
}
