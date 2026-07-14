import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getNetWorthModel } from "@/lib/aggregate";
import { netWorthChange } from "@/lib/networth-change";
import { getAccounts, getNetWorthHistory } from "@/db/queries";
import { getFxRates, toEur } from "@/lib/fx-server";
import { getLicenseStatus } from "@/lib/license-status";
import { hasSampleData } from "@/lib/sample-data";
import { AccountsManager } from "@/components/accounts/AccountsManager";
import { GettingStarted, SampleDataBanner } from "@/components/onboarding/GettingStarted";
import { HeroNetWorth } from "@/components/HeroNetWorth";
import { LivePricesBar } from "@/components/LivePricesBar";
import { Card, SectionTitle, PageGrid, Badge } from "@/components/ui/primitives";
import { StatTiles, type TileMetric } from "@/components/overview/StatTiles";
import { Donut, Legend } from "@/components/charts/Donut";
import { NetWorthTrend } from "@/components/charts/NetWorthTrend";
import { ExposureBar } from "@/components/charts/ExposureBar";
import { GEO_COLORS, CURRENCY_COLORS, PALETTE } from "@/components/charts/palette";

export const dynamic = "force-dynamic";

const LICENSE_TIER_LABEL: Record<string, string> = {
  "self-host": "Self-host license",
  updates: "License + updates",
  trial: "Trial",
  none: "Unlicensed",
};

export default async function OverviewPage() {
  const [m, accountsRaw, fx, history, licenseStatus, sampleDataPresent] =
    await Promise.all([
      getNetWorthModel(),
      getAccounts(),
      getFxRates(),
      getNetWorthHistory(),
      getLicenseStatus(),
      hasSampleData().catch(() => false),
    ]);
  const trend = history.map((h) => ({ date: h.snapshotDate, totalEur: h.totalEur }));
  const change = netWorthChange(trend, m.totalNetWorthEur);
  const accounts = accountsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.balance,
    currency: a.currency,
    isCompany: a.isCompany,
    balanceEur: toEur(a.balance, a.currency, fx.rates),
  }));

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

  // Catalog of every metric that can occupy a KPI tile. Raw EUR/pct values are
  // passed through; the client tile renders them in the active display currency.
  const tileCatalog: TileMetric[] = [
    { id: "total_invested", label: "Total invested", type: "money", eur: m.totalInvestedEur },
    { id: "current_value", label: "Current value", type: "money", eur: m.totalCurrentValueEur },
    { id: "unrealized_pl", label: "Unrealized P/L", type: "moneyDelta", eur: m.unrealizedPlEur, pct: m.unrealizedPct },
    { id: "realized_pl_ytd", label: "Realized P/L (YTD)", type: "moneyDelta", eur: m.realizedPlYtdEur },
    { id: "romanian", label: `In ${m.concentration.homeMarket.currency} assets`, type: "pct", pct: m.concentration.homeMarket.pct },
    { id: "illiquid", label: "Illiquid (property + loans)", type: "pct", pct: m.concentration.illiquidPct },
    { id: "real_estate", label: "Real estate", type: "moneyCompact", eur: m.components.propertiesEur },
    { id: "businesses", label: "Businesses", type: "moneyCompact", eur: m.components.businessesEur },
    { id: "cash", label: "Cash", type: "moneyCompact", eur: m.components.accountsEur },
    { id: "loans", label: "Loans", type: "moneyCompact", eur: m.components.loansEur },
    { id: "total_net_worth", label: "Total net worth", type: "money", eur: m.totalNetWorthEur },
    { id: "personal_net_worth", label: "Personal net worth", type: "money", eur: m.personalNetWorthEur },
    // One tile per asset class actually held (Crypto, US Stocks, REIT, …).
    ...m.allocationByClass.map((a) => ({
      id: `class:${a.label}`,
      label: a.label,
      type: "moneyCompact" as const,
      eur: a.valueEur,
    })),
  ];
  const defaultTileIds = [
    "total_invested",
    "current_value",
    "unrealized_pl",
    "realized_pl_ytd",
    "romanian",
    "illiquid",
    "real_estate",
    "cash",
  ];

  const flag = (pct: number, amber: number, red: number) =>
    pct >= red ? "loss" : pct >= amber ? "amber" : "neutral";

  const trial = licenseStatus.tier === "trial" || licenseStatus.tier === "none";

  // First run: nothing anywhere yet → guide to the first import instead of
  // rendering a wall of empty €0 charts.
  const firstRun =
    accountsRaw.length === 0 &&
    m.allocationByClass.length === 0 &&
    m.totalNetWorthEur === 0 &&
    trend.length === 0;

  if (firstRun) {
    return (
      <PageGrid>
        <div className="flex justify-end">
          <Link href="/dashboard/license" className="focusring rounded-md">
            <Badge tone={trial ? "amber" : "gain"}>
              <KeyRound size={12} className="mr-1" />
              {LICENSE_TIER_LABEL[licenseStatus.tier]}
            </Badge>
          </Link>
        </div>
        <GettingStarted />
      </PageGrid>
    );
  }

  return (
    <PageGrid>
      <div className="flex justify-end">
        <Link href="/dashboard/license" className="focusring rounded-md">
          <Badge tone={trial ? "amber" : "gain"}>
            <KeyRound size={12} className="mr-1" />
            {LICENSE_TIER_LABEL[licenseStatus.tier]}
          </Badge>
        </Link>
      </div>
      {sampleDataPresent && <SampleDataBanner />}
      <LivePricesBar />
      <HeroNetWorth
        totalEur={m.totalNetWorthEur}
        personalEur={m.personalNetWorthEur}
        companyEur={m.companyCashEur}
        change={change}
      />

      {/* KPI row — customizable (reorder + swap which metrics show) */}
      <StatTiles catalog={tileCatalog} defaultIds={defaultTileIds} />

      {/* Net worth over time */}
      <Card>
        <SectionTitle>Net worth over time</SectionTitle>
        <NetWorthTrend
          data={trend}
          note="Past points value holdings at cost basis and interpolate property value between its purchase price and today; the latest point uses live market prices."
        />
      </Card>

      {/* Allocations */}
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

      {/* Currency exposure */}
      <Card>
        <SectionTitle>Currency exposure</SectionTitle>
        <ExposureBar data={exposure} />
      </Card>

      {/* Cash & accounts (editable) */}
      <AccountsManager accounts={accounts} />

      {/* Concentration flags */}
      <Card>
        <SectionTitle>Concentration flags</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FlagStat
            label="Largest position"
            value={`${m.concentration.largestSymbol}`}
            pct={m.concentration.largestPct}
            tone={flag(m.concentration.largestPct, 0.15, 0.25)}
          />
          <FlagStat
            label="Home market"
            value={`${m.concentration.homeMarket.currency} assets`}
            pct={m.concentration.homeMarket.pct}
            tone={flag(m.concentration.homeMarket.pct, 0.5, 0.7)}
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
