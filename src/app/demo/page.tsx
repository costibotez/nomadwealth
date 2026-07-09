import { HeroNetWorth } from "@/components/HeroNetWorth";
import { Card, SectionTitle, PageGrid, Badge } from "@/components/ui/primitives";
import { StatTiles, type TileMetric } from "@/components/overview/StatTiles";
import { Donut, Legend } from "@/components/charts/Donut";
import { NetWorthTrend } from "@/components/charts/NetWorthTrend";
import { ExposureBar } from "@/components/charts/ExposureBar";
import { GEO_COLORS, CURRENCY_COLORS, PALETTE } from "@/components/charts/palette";
import { AccountsManager } from "@/components/accounts/AccountsManager";
import {
  DEMO_NET_WORTH as m,
  DEMO_NET_WORTH_HISTORY,
  DEMO_ACCOUNTS,
} from "@/lib/demo-fixtures";

// Mirrors src/app/dashboard/page.tsx, but reads only from static demo fixtures.
export default function DemoOverviewPage() {
  const trend = DEMO_NET_WORTH_HISTORY;

  const classSlices = m.allocationByClass.map((a, i) => ({
    name: a.label,
    eur: a.valueEur,
    color: PALETTE[i % PALETTE.length],
  }));
  const geoSlices = m.allocationByGeography.map((g) => ({
    name: g.key,
    eur: g.valueEur,
    color: GEO_COLORS[g.key] ?? "#8aa0b8",
  }));
  const exposure = m.currencyExposure.map((c) => ({
    label: c.currency,
    eur: c.valueEur,
    color: CURRENCY_COLORS[c.currency] ?? "#8aa0b8",
  }));

  const tileCatalog: TileMetric[] = [
    { id: "total_invested", label: "Total invested", type: "money", eur: m.totalInvestedEur },
    { id: "current_value", label: "Current value", type: "money", eur: m.totalCurrentValueEur },
    { id: "unrealized_pl", label: "Unrealized P/L", type: "moneyDelta", eur: m.unrealizedPlEur, pct: m.unrealizedPct },
    { id: "realized_pl_ytd", label: "Realized P/L (YTD)", type: "moneyDelta", eur: m.realizedPlYtdEur },
    { id: "romanian", label: "In Romanian assets", type: "pct", pct: m.concentration.romanianPct },
    { id: "illiquid", label: "Illiquid (property + loans)", type: "pct", pct: m.concentration.illiquidPct },
    { id: "real_estate", label: "Real estate", type: "moneyCompact", eur: m.components.propertiesEur },
    { id: "cash", label: "Cash", type: "moneyCompact", eur: m.components.accountsEur },
  ];
  const defaultTileIds = tileCatalog.map((t) => t.id);

  const flag = (pct: number, amber: number, red: number) =>
    pct >= red ? "loss" : pct >= amber ? "amber" : "neutral";

  return (
    <PageGrid>
      <HeroNetWorth
        totalEur={m.totalNetWorthEur}
        personalEur={m.personalNetWorthEur}
        companyEur={m.companyCashEur}
        changeEur={m.unrealizedPlEur}
        changePct={m.unrealizedPct}
      />

      <StatTiles catalog={tileCatalog} defaultIds={defaultTileIds} />

      <Card>
        <SectionTitle>Net worth over time</SectionTitle>
        <NetWorthTrend data={trend} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Allocation by asset class</SectionTitle>
          <Donut data={classSlices} />
          <div className="mt-4">
            <Legend data={classSlices} />
          </div>
        </Card>
        <Card>
          <SectionTitle>Allocation by geography</SectionTitle>
          <Donut data={geoSlices} centerLabel="Net worth" />
          <div className="mt-4">
            <Legend data={geoSlices} />
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Currency exposure</SectionTitle>
        <ExposureBar data={exposure} />
      </Card>

      <AccountsManager accounts={DEMO_ACCOUNTS} />

      <Card>
        <SectionTitle>Concentration flags</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FlagStat
            label="Largest position"
            value={m.concentration.largestSymbol}
            pct={m.concentration.largestPct}
            tone={flag(m.concentration.largestPct, 0.15, 0.25)}
          />
          <FlagStat
            label="Romanian assets"
            value="Concentration"
            pct={m.concentration.romanianPct}
            tone={flag(m.concentration.romanianPct, 0.5, 0.7)}
          />
          <FlagStat
            label="Illiquid"
            value="Property + loans"
            pct={m.concentration.illiquidPct}
            tone={flag(m.concentration.illiquidPct, 0.5, 0.7)}
          />
        </div>
      </Card>
    </PageGrid>
  );
}

function FlagStat({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "neutral" | "amber" | "loss";
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        <Badge tone={tone === "loss" ? "loss" : tone === "amber" ? "amber" : "neutral"}>
          {(pct * 100).toFixed(1)}%
        </Badge>
      </div>
      <div className="mt-1.5 font-medium">{value}</div>
    </div>
  );
}
