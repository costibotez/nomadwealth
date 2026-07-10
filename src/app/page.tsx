import type { Metadata } from "next";
import { PublicHeader } from "@/components/nw/PublicHeader";
import { Hero } from "@/components/marketing/Hero";
import {
  WhoItsForSection,
  OwnDataSection,
  FeaturesSection,
  ComparisonSection,
  PricingSection,
  EarlyAccessSection,
} from "@/components/marketing/Sections";
import { Footer } from "@/components/marketing/Footer";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { StructuredData } from "@/components/marketing/StructuredData";
import { getActiveCampaign } from "@/lib/campaign";

const description =
  "Self-hosted net-worth & investment cockpit. Multi-currency, multi-asset (holdings, real estate, private loans, business income) plus a FIRE projection — deployed to your own Vercel and Neon Postgres. We literally can't see your data.";

export const metadata: Metadata = {
  title: {
    absolute: "NomadWealth — your net worth, on infrastructure only you can audit",
  },
  description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "NomadWealth — self-hosted net-worth cockpit",
    description,
    url: "/",
    siteName: "NomadWealth",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "NomadWealth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NomadWealth — self-hosted net-worth cockpit",
    description,
    images: ["/og-image.png"],
  },
};

export default async function LandingPage() {
  const campaign = await getActiveCampaign();
  return (
    <div className="min-h-screen bg-bg text-text">
      <StructuredData />
      <PromoBanner campaign={campaign} />
      <PublicHeader />
      <main>
        <Hero />
        <WhoItsForSection />
        <ComparisonSection />
        <FeaturesSection />
        <OwnDataSection />
        <PricingSection campaign={campaign} />
        <EarlyAccessSection />
      </main>
      <Footer />
    </div>
  );
}
