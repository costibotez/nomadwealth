import type { Metadata } from "next";
import { ShieldCheck, EyeOff, Server, KeyRound } from "lucide-react";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Footer } from "@/components/marketing/Footer";
import { Eyebrow } from "@/components/nw/primitives";

const description =
  "NomadWealth is self-hosted: your financial data lives in your own Neon database on your own Vercel deployment. We literally cannot see it. No analytics on financial values, no error reporting with data payloads.";

export const metadata: Metadata = {
  title: "Security & Privacy",
  description,
  alternates: { canonical: "/security" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Security & Privacy · NomadWealth",
    description,
    url: "/security",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

const PILLARS = [
  {
    icon: EyeOff,
    title: "We can't see your data",
    body: "There is no vendor backend. Your numbers are written to your Neon Postgres, reached only from your Vercel deployment. We hold no credentials to either.",
  },
  {
    icon: Server,
    title: "Your infrastructure, end to end",
    body: "You supply DATABASE_URL, SESSION_SECRET and (optionally) a price-data API key. The app boots with zero vendor-side services. FX uses keyless Frankfurter.",
  },
  {
    icon: KeyRound,
    title: "Offline license activation",
    body: "License keys are verified locally with a public key. The only network call is a revocation check on activation that sends nothing but the opaque key (so refunded or leaked keys can be disabled) — never any financial data. Set LICENSE_API_URL=\"\" to turn it off entirely.",
  },
  {
    icon: ShieldCheck,
    title: "No tracking on your money",
    body: "We ship no analytics that capture financial values and no error reporting with data payloads. The only telemetry is a strictly opt-in activation ping (off by default) that sends a hashed key + tier — never any financial data.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <PublicHeader />
      <main className="mx-auto max-w-[820px] px-7 pb-16 pt-20">
        <Eyebrow>Security &amp; Privacy</Eyebrow>
        <h1 className="mt-3.5 text-[clamp(30px,5vw,48px)] font-bold tracking-[-0.03em]">
          We literally can&apos;t see your data.
        </h1>
        <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-muted">
          NomadWealth is a product you host, not a service you log into. Every
          figure — holdings, property, loans, income — is stored in a database
          you own and reached only by code running in your own account.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <section key={p.title} className="rounded-card border border-line bg-surface p-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-brand-tint text-brand">
                <p.icon size={19} />
              </div>
              <h2 className="text-[17px] font-semibold">{p.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.body}</p>
            </section>
          ))}
        </div>

        <section id="license" className="mt-14 scroll-mt-20">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">License (EULA), in short</h2>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-text-2">
            <li>• A NomadWealth license grants you the right to self-host the app for your own personal use.</li>
            <li>• You own your data outright. The vendor has no access to your deployment or database.</li>
            <li>• Updates are delivered as source you choose to deploy; support is community-based on the self-host tier.</li>
          </ul>
        </section>

        <p className="mt-14 text-[13px] text-dim">
          Questions? Email{" "}
          <a href="mailto:security@nomadwealth.app" className="text-brand hover:underline">
            security@nomadwealth.app
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
