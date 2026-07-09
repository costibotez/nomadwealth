import { getRealEstate } from "@/lib/page-data";
import { Card, PageGrid, Badge, EmptyState } from "@/components/ui/primitives";
import { Money, MoneyDelta } from "@/components/ui/money";
import { formatPct } from "@/lib/format";
import {
  PropertyEditButton,
  AddPropertyButton,
  RentEditor,
  LedgerEditor,
} from "@/components/properties/PropertyEditor";

export const dynamic = "force-dynamic";

export default async function RealEstatePage() {
  const props = await getRealEstate();

  return (
    <PageGrid>
      <div className="flex justify-end"><AddPropertyButton /></div>

      {props.length === 0 ? (
        <EmptyState message="No properties yet. Add one to track costs, sales, rent and ROI." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {props.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <div className="mt-0.5 text-2xl font-semibold">
                    <Money eur={p.status === "sold" && p.saleProceedsEur != null ? p.saleProceedsEur : p.valueEur} />
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {p.status === "sold" ? `Sold${p.saleDate ? ` ${p.saleDate}` : ""}` : "Current value"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.status === "sold" ? <Badge tone="neutral">Sold</Badge> : p.isRented ? <Badge tone="gain">Rented</Badge> : <Badge tone="amber">Idle</Badge>}
                  <PropertyEditButton
                    property={{
                      id: p.id, name: p.name, value: p.value, currency: p.currency,
                      monthlyRent: p.monthlyRent, isRented: p.isRented, status: p.status,
                      purchaseDate: p.purchaseDate, purchasePrice: p.purchasePrice,
                      saleDate: p.saleDate, salePrice: p.salePrice, notes: p.notes,
                    }}
                  />
                </div>
              </div>

              {/* Headline economics */}
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Row label="Total investment" value={p.investmentEur != null ? <Money eur={p.investmentEur} /> : <span className="text-ink-faint">set costs</span>} />
                <Row label="Total rent" value={<Money eur={p.totalRentEur} />} />
                <Row label="Rental yield" value={<span className="tnum">{formatPct(p.cumulativeRoi, { signed: false })}</span>} />
                {p.saleProceedsEur != null && <Row label="Sale proceeds" value={<Money eur={p.saleProceedsEur} />} />}
                {p.capitalGainEur != null && <Row label="Capital gain" value={<MoneyDelta eur={p.capitalGainEur} />} />}
                <Row label="Total income" value={<Money eur={p.totalIncomeEur} />} />
                {p.netProfitEur != null && <Row label="Net profit" value={<MoneyDelta eur={p.netProfitEur} />} />}
                {p.totalRoi != null && <Row label="Total ROI" value={<span className="tnum">{formatPct(p.totalRoi, { signed: false })}</span>} />}
              </dl>

              {/* Itemised cost / sale breakdown */}
              {(p.acquisitions.length > 0 || p.sales.length > 0) && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {p.acquisitions.length > 0 && (
                    <Breakdown title="Costs" rows={p.acquisitions} total={p.investmentEur ?? 0} />
                  )}
                  {p.sales.length > 0 && (
                    <Breakdown title="Sales" rows={p.sales} total={p.saleProceedsEur ?? 0} tone="gain" />
                  )}
                </div>
              )}

              {/* Yearly rent */}
              {p.years.length > 0 && (
                <table className="mt-4 w-full text-xs">
                  <thead>
                    <tr className="text-left text-ink-faint">
                      <th className="py-1 font-medium">Year</th>
                      <th className="py-1 text-right font-medium">Rent</th>
                      <th className="py-1 text-right font-medium">Yield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.years.map((y) => (
                      <tr key={y.year} className="border-t border-border/40">
                        <td className="py-1">{y.year}</td>
                        <td className="py-1 text-right"><Money eur={y.incomeEur} className="text-ink-muted" /></td>
                        <td className="tnum py-1 text-right text-ink-muted">{formatPct(y.roi, { signed: false })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <LedgerEditor
                propertyId={p.id}
                defaultCurrency={p.currency === "USD" ? "EUR" : p.currency}
                entries={[...p.acquisitions, ...p.sales].map((l, i) => ({
                  id: l.id,
                  kind: i < p.acquisitions.length ? "acquisition" : "sale",
                  label: l.label,
                  amount: l.amount,
                  currency: l.currency,
                }))}
              />
              <RentEditor
                propertyId={p.id}
                defaultCurrency={p.currency === "USD" ? "EUR" : p.currency}
                entries={p.years.flatMap((y) => y.entries.map((e) => ({ id: e.id, year: e.year, month: e.month, amount: e.amount, currency: e.currency })))}
              />

              {p.notes && <p className="mt-3 text-xs text-ink-faint">{p.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        Total investment = sum of cost items; total income = sale proceeds + all rent received;
        ROI = total income ÷ investment − 1. Rental yield = total rent ÷ investment. Every line is
        stored in its own currency and normalised via live FX.
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

function Breakdown({
  title,
  rows,
  total,
  tone,
}: {
  title: string;
  rows: { id: number; label: string; eur: number }[];
  total: number;
  tone?: "gain";
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-3">
      <div className="stat-label mb-1.5">{title}</div>
      <ul className="space-y-1 text-xs">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between">
            <span className="text-ink-muted">{r.label}</span>
            <Money eur={r.eur} className={tone === "gain" ? "text-gain" : "text-ink"} />
          </li>
        ))}
        <li className="flex justify-between border-t border-border/50 pt-1 font-medium">
          <span>Total</span>
          <Money eur={total} />
        </li>
      </ul>
    </div>
  );
}
