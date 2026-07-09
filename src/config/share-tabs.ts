/**
 * The tabs that may be exposed through a read-only share link, with display
 * labels. Kept as a plain config (no component imports) so it is safe to use
 * from client components. The hrefs MUST match the keys in
 * src/app/share/[token]/tab-registry.ts, which maps each href to its page.
 */
export interface ShareableTab {
  href: string;
  label: string;
}

export const SHAREABLE_TABS: ShareableTab[] = [
  { href: "/", label: "Overview" },
  { href: "/holdings", label: "Holdings" },
  { href: "/transactions", label: "Transactions" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/performance", label: "Performance" },
  { href: "/dividends", label: "Dividends" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/businesses", label: "Businesses" },
  { href: "/clients", label: "Clients" },
  { href: "/loans", label: "Loans" },
  { href: "/projection", label: "FIRE / Projection" },
  { href: "/wedding", label: "Wedding 2026" },
];

export const SHAREABLE_HREFS = SHAREABLE_TABS.map((t) => t.href);
