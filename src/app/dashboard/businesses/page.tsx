import { getBusinessesModel } from "@/lib/page-data";
import { Card, PageGrid, Badge, EmptyState } from "@/components/ui/primitives";
import { Money, MoneyDelta } from "@/components/ui/money";
import { formatPct } from "@/lib/format";
import {
  AddBusinessButton,
  BusinessEditButton,
  BusinessLedgerEditor,
} from "@/components/businesses/BusinessEditor";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const biz = await getBusinessesModel();

  return (
    <PageGrid>
      <div className="flex justify-end"><AddBusinessButton /></div>

      {biz.length === 0 ? (
        <EmptyState message="No businesses yet. Add one to track revenue, COGS and gross margin." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {biz.map((b) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{b.name}</h3>
                  <div className="mt-0.5 text-2xl font-semibold">
                    {b.valuationEur != null ? <Money eur={b.valuationEur} /> : <span className="text-ink-faint">No valuation</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {b.valuationEur != null ? (b.status === "active" ? "Valuation · counts to net worth" : "Valuation") : "Set a valuation to include in net worth"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.status === "active" ? <Badge tone="gain">Active</Badge> : <Badge tone="neutral">{b.status}</Badge>}
                  <BusinessEditButton
                    business={{
                      id: b.id, name: b.name, currency: b.currency, status: b.status,
                      valuation: b.valuation, startedOn: b.startedOn, notes: b.notes,
                    }}
                  />
                </div>
              </div>

              {/* Lifetime economics */}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Row label="Total revenue" value={<Money eur={b.totalRevenueEur} />} />
                <Row label="Total COGS" value={<Money eur={b.totalCogsEur} />} />
                <Row label="Gross profit" value={<MoneyDelta eur={b.totalGrossProfitEur} />} />
                <Row label="Gross margin" value={<span className="tnum">{b.lifetimeGrossMargin != null ? formatPct(b.lifetimeGrossMargin, { signed: false }) : "—"}</span>} />
              </dl>

              {/* Per-year P&L */}
              {b.years.length > 0 && (
                <table className="mt-4 w-full text-xs">
                  <thead>
                    <tr className="text-left text-ink-faint">
                      <th className="py-1 font-medium">Year</th>
                      <th className="py-1 text-right font-medium">Revenue</th>
                      <th className="py-1 text-right font-medium">COGS</th>
                      <th className="py-1 text-right font-medium">Gross</th>
                      <th className="py-1 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.years.map((y) => (
                      <tr key={y.year} className="border-t border-border/40">
                        <td className="py-1">{y.year}</td>
                        <td className="py-1 text-right"><Money eur={y.revenueEur} className="text-ink-muted" /></td>
                        <td className="py-1 text-right"><Money eur={y.cogsEur} className="text-ink-muted" /></td>
                        <td className="py-1 text-right"><Money eur={y.grossProfitEur} className="text-ink-muted" /></td>
                        <td className="tnum py-1 text-right text-ink-muted">{y.grossMargin != null ? formatPct(y.grossMargin, { signed: false }) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <BusinessLedgerEditor
                businessId={b.id}
                defaultCurrency={b.currency}
                entries={b.ledger}
              />

              {b.notes && <p className="mt-3 text-xs text-ink-faint">{b.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        Gross profit = revenue − COGS. A business&apos;s valuation (when set and active) counts toward your net worth, like a property&apos;s value. Every line is stored in its own currency and normalised via live FX.
      </p>
    </PageGrid>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
