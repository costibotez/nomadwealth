import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow, Button } from "@/components/nw/primitives";
import { MacBookFrame, MiniSidebar } from "@/components/marketing/MacBookFrame";
import { HeroChart } from "@/components/marketing/HeroChart";

const description =
  "See the NomadWealth cockpit: a single screen for net worth across holdings, real estate, loans, cash and business income, with live multi-currency figures and a FIRE projection.";

export const metadata: Metadata = {
  title: "The cockpit",
  description,
  alternates: { canonical: "/cockpit" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "The NomadWealth cockpit",
    description,
    url: "/cockpit",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

const num = "mono tabular-nums";

/* ---- mini dashboards ---- */
function MiniOverview() {
  return (
    <div className="flex text-[10px]" style={{ minHeight: 300 }}>
      <MiniSidebar active="Overview" />
      <div className="flex-1 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span style={{ color: "var(--mac-muted)" }}>Overview</span>
          <span className="rounded bg-brand-tint px-1.5 py-0.5 text-brand">EUR</span>
        </div>
        <div className="mb-1 text-[8px]" style={{ color: "var(--mac-dim)" }}>
          TOTAL NET WORTH
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`${num} text-[22px] font-semibold`}>€526,636</span>
          <span className={`${num} text-[10px] text-[color:var(--nw-gain)]`}>
            +€18,495 (+13.7%)
          </span>
        </div>
        <div className="my-3 h-16 overflow-hidden rounded" style={{ background: "var(--mac-panel-2)" }}>
          <HeroChart />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            ["Holdings", "€214k"],
            ["Real estate", "€250k"],
            ["Loans", "€38k"],
            ["Cash", "€24k"],
          ].map(([l, v]) => (
            <div key={l} className="rounded p-1.5" style={{ background: "var(--mac-panel)" }}>
              <div className="text-[7px]" style={{ color: "var(--mac-dim)" }}>{l}</div>
              <div className={`${num} text-[10px] font-semibold`}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniHoldings() {
  const rows = [
    ["META", "€16,318", "-5.1%", "loss"],
    ["MSFT", "€4,261", "-12.1%", "loss"],
    ["NOW", "€1,370", "+0.9%", "gain"],
    ["FIG", "€450", "-69.5%", "loss"],
  ] as const;
  return (
    <div className="flex text-[10px]" style={{ minHeight: 300 }}>
      <MiniSidebar active="Holdings" />
      <div className="flex-1 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span style={{ color: "var(--mac-muted)" }}>US Stocks</span>
          <span className="rounded bg-brand-tint px-1.5 py-0.5 text-[8px] text-brand">
            + Add transaction
          </span>
        </div>
        <div
          className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-2 border-b pb-1 text-[8px]"
          style={{ borderColor: "rgba(255,255,255,.06)", color: "var(--mac-dim)" }}
        >
          <span>Symbol</span>
          <span className="text-right">Value</span>
          <span className="text-right">P/L %</span>
        </div>
        {rows.map(([s, v, pl, tone]) => (
          <div
            key={s}
            className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-2 border-b py-1.5"
            style={{ borderColor: "rgba(255,255,255,.04)" }}
          >
            <span className="font-semibold">{s}</span>
            <span className={`${num} text-right`}>{v}</span>
            <span
              className={`${num} text-right`}
              style={{ color: tone === "gain" ? "var(--nw-gain)" : "var(--nw-loss)" }}
            >
              {pl}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniPerformance() {
  return (
    <div className="flex text-[10px]" style={{ minHeight: 300 }}>
      <MiniSidebar active="Performance" />
      <div className="flex-1 p-3">
        <div className="mb-2" style={{ color: "var(--mac-muted)" }}>Performance</div>
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {[
            ["Total P/L", "+€42,180", "gain"],
            ["Realized", "+€12,940", "gain"],
            ["Unrealized", "-€3,146", "loss"],
          ].map(([l, v, tone]) => (
            <div key={l} className="rounded p-1.5" style={{ background: "var(--mac-panel)" }}>
              <div className="text-[7px]" style={{ color: "var(--mac-dim)" }}>{l}</div>
              <div
                className={`${num} text-[10px] font-semibold`}
                style={{ color: tone === "gain" ? "var(--nw-gain)" : "var(--nw-loss)" }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {["Best performers", "Biggest gains", "Worst performers", "Biggest losses"].map((t) => (
            <div key={t} className="rounded p-2" style={{ background: "var(--mac-panel-2)" }}>
              <div className="mb-1 text-[8px] font-semibold">{t}</div>
              <div className="text-[8px]" style={{ color: "var(--mac-muted)" }}>NVDA · +212%</div>
              <div className="text-[8px]" style={{ color: "var(--mac-muted)" }}>BTC · +64%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  {
    eyebrow: "Overview",
    title: "One screen for everything you own.",
    body: "Net worth across every asset class and currency, updated live. Personal and company balances, split out or combined.",
    checks: ["Live multi-currency totals", "Personal vs. company split", "Trend since day one"],
    mini: <MiniOverview />,
  },
  {
    eyebrow: "Holdings",
    title: "Every lot, priced and reconciled.",
    body: "Public stocks, crypto and funds with average cost, invested capital, value and P/L — per lot and in total.",
    checks: ["Per-lot cost basis", "Live price refresh", "Realized & unrealized P/L"],
    mini: <MiniHoldings />,
  },
  {
    eyebrow: "Performance",
    title: "Know what's actually working.",
    body: "Best and worst performers by percent and by euro, realized versus unrealized, at a glance.",
    checks: ["Best / worst performers", "Biggest gains & losses", "Realized vs. unrealized"],
    mini: <MiniPerformance />,
  },
];

export default function CockpitPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader />
      <main className="mx-auto max-w-[1080px] px-7 pb-16 pt-20">
        <div className="text-center">
          <Eyebrow>The cockpit</Eyebrow>
          <h1 className="mx-auto mt-3.5 max-w-[18ch] text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.03em]">
            One screen for everything you own.
          </h1>
        </div>

        <div className="mt-16 space-y-20">
          {ROWS.map((r, i) => (
            <div
              key={r.eyebrow}
              className={
                "grid items-center gap-10 lg:grid-cols-2 " +
                (i % 2 ? "lg:[&>*:first-child]:order-2" : "")
              }
            >
              <div>
                <Eyebrow>{r.eyebrow}</Eyebrow>
                <h2 className="mt-3 text-[clamp(22px,3vw,30px)] font-bold tracking-[-0.02em]">
                  {r.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{r.body}</p>
                <ul className="mt-5 space-y-2">
                  {r.checks.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[14px] text-text-2">
                      <Check size={15} className="text-brand" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                <MacBookFrame>{r.mini}</MacBookFrame>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-wrap justify-center gap-3.5">
          <Link href="/demo">
            <Button size="lg">Try the live demo →</Button>
          </Link>
          <Link href="/setup">
            <Button size="lg" variant="secondary">
              Deploy your cockpit
            </Button>
          </Link>
          <Link href="/#pricing">
            <Button size="lg" variant="secondary">
              See pricing →
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
