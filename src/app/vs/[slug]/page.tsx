import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, X, Minus } from "lucide-react";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow, Button } from "@/components/nw/primitives";

type Cell = "yes" | "no" | "partial";
interface Comparison {
  competitor: string;
  title: string;
  description: string;
  intro: string;
  rows: { label: string; us: Cell; them: Cell }[];
  verdict: string;
}

const COMPARISONS: Record<string, Comparison> = {
  ghostfolio: {
    competitor: "Ghostfolio",
    title: "NomadWealth vs Ghostfolio",
    description:
      "Ghostfolio is a great open-source portfolio tracker for public markets. NomadWealth tracks your whole net worth — real estate, private loans, business income and cash too — with a FIRE projection, self-hosted.",
    intro:
      "Ghostfolio is a well-loved open-source tracker focused on public market holdings — stocks, ETFs and crypto. NomadWealth is a whole-net-worth cockpit: it counts the assets a brokerage tracker can't — real estate, private loans you've made, business income and cash — in one honest number, in the currency you think in, with a forward FIRE projection. Both are self-hostable and privacy-first.",
    rows: [
      { label: "Public holdings (stocks, ETFs, crypto)", us: "yes", them: "yes" },
      { label: "Self-hosted, your own data", us: "yes", them: "yes" },
      { label: "Real estate", us: "yes", them: "no" },
      { label: "Private loans receivable", us: "yes", them: "no" },
      { label: "Business income & cash", us: "yes", them: "partial" },
      { label: "First-class multi-currency net worth", us: "yes", them: "partial" },
      { label: "FIRE / net-worth projection", us: "yes", them: "no" },
      { label: "Guided setup wizard + CSV/Excel import", us: "yes", them: "partial" },
    ],
    verdict:
      "If you only hold public-market assets, Ghostfolio is excellent. If your net worth also includes property, private loans, a business or cash across currencies, NomadWealth gives you the complete picture in one place.",
  },
  spreadsheet: {
    competitor: "a spreadsheet",
    title: "NomadWealth vs a spreadsheet",
    description:
      "Spreadsheets are flexible but break and go stale. NomadWealth gives you the same control over your data with live FX, live prices, a structured multi-asset model and a FIRE projection — no formulas to fix.",
    intro:
      "A spreadsheet is the honest starting point — flexible, private, entirely yours. But it breaks: formulas rot, FX is manual, prices go stale, and the whole thing needs constant fixing. NomadWealth keeps everything you like about the spreadsheet — you own the data, it runs on your own infrastructure — and removes the maintenance: live FX, live prices, a proper multi-asset model, and a projection that updates itself.",
    rows: [
      { label: "You own your data", us: "yes", them: "yes" },
      { label: "No formulas to fix", us: "yes", them: "no" },
      { label: "Live FX across currencies", us: "yes", them: "no" },
      { label: "Live market prices", us: "yes", them: "no" },
      { label: "Structured multi-asset model", us: "yes", them: "partial" },
      { label: "FIRE / net-worth projection", us: "yes", them: "partial" },
      { label: "Read-only share links", us: "yes", them: "partial" },
      { label: "Guided onboarding & import", us: "yes", them: "no" },
    ],
    verdict:
      "A spreadsheet wins on flexibility for a while. Once you're tracking multiple asset types across currencies, NomadWealth gives you the same ownership without the constant upkeep.",
  },
};

export function generateStaticParams() {
  return Object.keys(COMPARISONS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = COMPARISONS[slug];
  if (!c) return {};
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `/vs/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${c.title} · NomadWealth`,
      description: c.description,
      url: `/vs/${slug}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${c.title} · NomadWealth`,
      description: c.description,
      images: ["/og-image.png"],
    },
  };
}

const ICON: Record<Cell, React.ReactNode> = {
  yes: <Check size={16} className="text-[color:var(--nw-gain)]" />,
  no: <X size={16} className="text-dim" />,
  partial: <Minus size={16} className="text-muted" />,
};

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = COMPARISONS[slug];
  if (!c) notFound();

  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader />
      <main className="mx-auto max-w-[820px] px-7 pb-20 pt-20">
        <Eyebrow>Compare</Eyebrow>
        <h1 className="mt-3.5 text-[clamp(30px,5vw,46px)] font-bold tracking-[-0.03em]">{c.title}</h1>
        <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-muted">{c.intro}</p>

        <div className="mt-11 overflow-hidden rounded-card border border-line">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left">
                <th className="px-5 py-3 font-medium text-text-2">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-brand">NomadWealth</th>
                <th className="px-4 py-3 text-center font-medium capitalize text-muted">{c.competitor}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-text-2">{r.label}</td>
                  <td className="px-4 py-3"><div className="flex justify-center">{ICON[r.us]}</div></td>
                  <td className="px-4 py-3"><div className="flex justify-center">{ICON[r.them]}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 max-w-[62ch] text-[15px] leading-relaxed text-text-2">{c.verdict}</p>

        <div className="mt-9 flex flex-wrap gap-3.5">
          <Link href="/demo">
            <Button size="lg">Try the live demo →</Button>
          </Link>
          <Link href="/#pricing">
            <Button size="lg" variant="secondary">See pricing</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
