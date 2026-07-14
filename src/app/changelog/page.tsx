import type { Metadata } from "next";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/nw/primitives";

const description =
  "What's new in NomadWealth — features, improvements and fixes, newest first.";

export const metadata: Metadata = {
  title: "Changelog",
  description,
  alternates: { canonical: "/changelog" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Changelog · NomadWealth",
    description,
    url: "/changelog",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog · NomadWealth",
    description,
    images: ["/og-image.png"],
  },
};

const RELEASES: { date: string; version: string; items: string[] }[] = [
  {
    date: "2026-07-12",
    version: "1.6",
    items: [
      "Your net-worth headline now shows a true change over the past 30 days — the whole balance sheet moving, not just your holdings' unrealized P/L.",
      "Home-market concentration now names your dominant currency (e.g. “In RON assets”) and works from any country — no more hardcoded assumptions.",
      "More accurate currency exposure: each holding is counted in the currency it actually trades in.",
      "The net-worth trend now shows property value rising gradually between purchase and today, instead of a flat step at its current value.",
      "Homepage refresh — a clearer, benefit-led hero and tightened messaging throughout.",
      "Live demo polish: fixed a stray error and clearer sample-rate labeling.",
    ],
  },
  {
    date: "2026-07-10",
    version: "1.5",
    items: [
      "Price alerts now reach you by browser push or email — checked on the server, so they fire even when the app is closed.",
      "Change your owner password right from Settings, and enable optional two-factor (TOTP) for login.",
      "Crypto watchlist charts restored on a keyless data source — no API key required.",
      "Schema updates now apply automatically on your next deploy — no manual migration step for existing installs.",
      "Polish: the collapsed sidebar now shows the crisp NomadWealth mark instead of a squeezed logo.",
    ],
  },
  {
    date: "2026-07-10",
    version: "1.4",
    items: [
      "License revocation with one-click revoke from the admin console.",
      "Renewal & expiry reminder emails before your updates window ends.",
      "A valid license is now required to finish first-run setup.",
      "Customer testimonials, schema.org structured data and an llms.txt for AI assistants.",
    ],
  },
  {
    date: "2026-07-09",
    version: "1.3",
    items: [
      "Campaign pricing engine — run promos (Black Friday, New Year, …) with Stripe promo codes.",
      "Branded transactional emails (license delivery, magic link, waitlist welcome, feedback ack).",
      "Feedback & early-access forms now post to your own infrastructure.",
      "Google Analytics moved behind a GDPR consent gate.",
    ],
  },
  {
    date: "2026-07-08",
    version: "1.2",
    items: [
      "Benefit-led homepage and pre-launch early-access waitlist.",
      "An 8-tab public live demo you can click through with sample data.",
      "Feedback & Support hub.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader />
      <main className="mx-auto max-w-[760px] px-7 pb-20 pt-20">
        <Eyebrow>Changelog</Eyebrow>
        <h1 className="mt-3.5 text-[clamp(30px,5vw,44px)] font-bold tracking-[-0.03em]">
          What&apos;s new
        </h1>
        <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed text-muted">
          Every release, newest first. NomadWealth ships as source you choose to deploy —
          you&apos;re always in control of when you update.
        </p>

        <div className="mt-12 space-y-10">
          {RELEASES.map((r) => (
            <section key={r.version} className="grid gap-4 sm:grid-cols-[140px_1fr]">
              <div className="sm:pt-0.5">
                <div className="text-[15px] font-semibold text-text">v{r.version}</div>
                <div className="text-[13px] text-dim">{r.date}</div>
              </div>
              <ul className="space-y-2.5 border-l border-line pl-5 text-[15px] leading-relaxed text-text-2">
                {r.items.map((it) => (
                  <li key={it} className="relative">
                    <span className="absolute -left-[23px] top-2 h-1.5 w-1.5 rounded-full bg-brand" />
                    {it}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
