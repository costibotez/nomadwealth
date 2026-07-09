import Link from "next/link";
import { getCashflow } from "@/lib/page-data";
import { Card, SectionTitle, PageGrid, StatCard, Badge } from "@/components/ui/primitives";
import { Money } from "@/components/ui/money";
import { IncomeExpenseBars } from "@/components/charts/BarsChart";
import { formatPct } from "@/lib/format";
import { CATEGORY_LABEL, CATEGORY_COLOR } from "@/config/income-categories";

export const dynamic = "force-dynamic";
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function CashflowPage() {
  const c = await getCashflow();
  const bars = c.monthly.map((m) => ({ label: MONTHS[m.month], income: m.income, expense: m.expense }));

  return (
    <PageGrid>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Income (YTD)" value={<Money eur={c.totalIncome} />} />
        <StatCard label="Expenses (YTD)" value={<Money eur={c.totalExpense} />} />
        <StatCard label="Net saved (YTD)" value={<Money eur={c.totalIncome - c.totalExpense} />} />
        <div className="card border-accent/30 p-4">
          <div className="stat-label">Savings rate (YTD)</div>
          <div className="mt-1.5 text-2xl font-semibold text-accent tnum">{formatPct(c.ytdSavingsRate, { signed: false })}</div>
        </div>
      </div>

      <Card>
        <SectionTitle>Monthly income vs expenses</SectionTitle>
        <IncomeExpenseBars data={bars} />
      </Card>

      <Card>
        <SectionTitle>Savings rate by month</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-faint">
                <th className="px-3 py-2 font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Income</th>
                <th className="px-3 py-2 text-right font-medium">Expenses</th>
                <th className="px-3 py-2 text-right font-medium">Saved</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {c.monthly.map((m) => (
                <tr key={m.month} className="border-b border-border/50">
                  <td className="px-3 py-2">{MONTHS[m.month]}</td>
                  <td className="px-3 py-2 text-right"><Money eur={m.income} /></td>
                  <td className="px-3 py-2 text-right"><Money eur={m.expense} /></td>
                  <td className="px-3 py-2 text-right"><Money eur={m.savings} /></td>
                  <td className="tnum px-3 py-2 text-right text-ink-muted">{formatPct(m.savingsRate, { signed: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Income by category (Legend)</SectionTitle>
          {c.untaggedCount > 0 && (
            <Link href="/dashboard/legend" className="focusring rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 hover:brightness-110">
              {c.untaggedCount} untagged → tag in Legend
            </Link>
          )}
        </div>
        {c.incomeByCategory.length === 0 ? (
          <p className="text-sm text-ink-faint">No income yet.</p>
        ) : (
          <ul className="space-y-2">
            {c.incomeByCategory.map((cat) => {
              const max = Math.max(...c.incomeByCategory.map((x) => x.eur), 1);
              return (
                <li key={cat.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-muted">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[cat.category] ?? "#5c6675" }} />
                      {CATEGORY_LABEL[cat.category] ?? cat.category}
                      {cat.category === "other" && <Badge tone="amber">untagged</Badge>}
                    </span>
                    <Money eur={cat.eur} compact className="text-ink-faint" />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel">
                    <div className="h-full rounded-full" style={{ width: `${(cat.eur / max) * 100}%`, background: CATEGORY_COLOR[cat.category] ?? "#5c6675" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Income by client</SectionTitle>
          <BreakdownList rows={c.byClient} />
          <p className="mt-3 text-xs text-ink-faint">
            Recurring (retainers): <Money eur={c.recurring} compact /> · One-off: <Money eur={c.oneOff} compact />
          </p>
        </Card>
        <Card>
          <SectionTitle>Expenses by category</SectionTitle>
          <BreakdownList rows={c.byCategory} />
        </Card>
      </div>
    </PageGrid>
  );
}

function BreakdownList({ rows }: { rows: { label: string; eur: number }[] }) {
  const max = Math.max(...rows.map((r) => r.eur), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate text-ink-muted">{r.label}</span>
            <Money eur={r.eur} compact className="text-ink-faint" />
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel">
            <div className="h-full rounded-full bg-accent/60" style={{ width: `${(r.eur / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
