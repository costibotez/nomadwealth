import { ASSET_CLASS_LABELS } from "@/lib/aggregate";
import { Card, SectionTitle, PageGrid, StatCard } from "@/components/ui/primitives";
import { MoneyDelta, Pct } from "@/components/ui/money";
import { DEMO_PERFORMANCE as p, type DemoPerfRow } from "@/lib/demo-fixtures";

// Mirrors src/app/dashboard/performance/page.tsx, but reads static demo fixtures.
export default function DemoPerformancePage() {
  return (
    <PageGrid>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Unrealized P/L" value={<MoneyDelta eur={p.totalUnrealized} />} />
        <StatCard label="Realized P/L (all time)" value={<MoneyDelta eur={p.totalRealized} />} />
        <StatCard label="Total P/L" value={<MoneyDelta eur={p.totalUnrealized + p.totalRealized} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Best performers (%)</SectionTitle>
          <PerfList rows={p.bestPct} mode="pct" />
        </Card>
        <Card>
          <SectionTitle>Worst performers (%)</SectionTitle>
          <PerfList rows={p.worstPct} mode="pct" />
        </Card>
        <Card>
          <SectionTitle>Biggest gains (€)</SectionTitle>
          <PerfList rows={p.bestAbs} mode="abs" />
        </Card>
        <Card>
          <SectionTitle>Biggest losses (€)</SectionTitle>
          <PerfList rows={p.worstAbs} mode="abs" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Realized P/L by asset class</SectionTitle>
          <RealizedTable rows={p.realizedByClass.map((r) => ({ label: ASSET_CLASS_LABELS[r.label] ?? r.label, pl: r.pl, count: r.count }))} />
        </Card>
        <Card>
          <SectionTitle>Realized P/L by year</SectionTitle>
          <RealizedTable rows={p.realizedByYear} />
        </Card>
      </div>
    </PageGrid>
  );
}

function PerfList({ rows, mode }: { rows: DemoPerfRow[]; mode: "pct" | "abs" }) {
  return (
    <ul className="divide-y divide-border/50">
      {rows.map((r) => (
        <li key={r.symbol} className="flex items-center justify-between py-2 text-sm">
          <span className="font-medium">{r.symbol}</span>
          <span>{mode === "pct" ? <Pct value={r.unrealizedPct} /> : <MoneyDelta eur={r.unrealizedPlEur} />}</span>
        </li>
      ))}
    </ul>
  );
}

function RealizedTable({ rows }: { rows: { label: string; pl: number; count: number }[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-border/50">
            <td className="py-2">{r.label}</td>
            <td className="py-2 text-right text-ink-faint">{r.count} trades</td>
            <td className="py-2 text-right"><MoneyDelta eur={r.pl} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
