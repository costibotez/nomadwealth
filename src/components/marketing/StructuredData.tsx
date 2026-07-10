import { PRICING } from "./content";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nomadwealth.app").replace(/\/+$/, "");

/**
 * JSON-LD structured data (schema.org SoftwareApplication + Offers) for the
 * marketing homepage — helps search engines show rich results and helps AI
 * assistants describe the product + pricing accurately. Server-rendered.
 */
export function StructuredData() {
  const offers = PRICING.map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: t.price.replace(/[^\d.]/g, ""),
    priceCurrency: "EUR",
    url: `${SITE}/#pricing`,
    availability: "https://schema.org/InStock",
  }));

  const json = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NomadWealth",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web (self-hosted on Vercel + Neon)",
    url: SITE,
    description:
      "Self-hostable personal net-worth & investment cockpit — multi-currency, multi-asset (public holdings, real estate, private loans, business income, cash, crypto) with a FIRE projection. Your data stays on your own Vercel and Neon Postgres; the vendor cannot see it.",
    offers,
    publisher: { "@type": "Organization", name: "NomadWealth", url: SITE },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
