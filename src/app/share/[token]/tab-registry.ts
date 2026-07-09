/**
 * Maps a shareable nav href to the dashboard page component that renders it.
 *
 * The share route reuses the EXISTING dashboard page components (async server
 * components) verbatim — so data fetching and layout stay in one place and the
 * shared view can never drift from the real dashboard. Read-only behaviour is
 * applied by wrapping these in <ReadonlyProvider> (see the share layout).
 *
 * Trash is intentionally not shareable.
 */
import type { ComponentType } from "react";
import OverviewPage from "@/app/dashboard/page";
import HoldingsPage from "@/app/dashboard/holdings/page";
import TransactionsPage from "@/app/dashboard/transactions/page";
import WatchlistPage from "@/app/dashboard/watchlist/page";
import PerformancePage from "@/app/dashboard/performance/page";
import DividendsPage from "@/app/dashboard/dividends/page";
import RealEstatePage from "@/app/dashboard/real-estate/page";
import BusinessesPage from "@/app/dashboard/businesses/page";
import ClientsPage from "@/app/dashboard/clients/page";
import LoansPage from "@/app/dashboard/loans/page";
import ProjectionPage from "@/app/dashboard/projection/page";
import WeddingPage from "@/app/dashboard/wedding/page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SHAREABLE_TABS: Record<string, ComponentType<any>> = {
  "/": OverviewPage,
  "/holdings": HoldingsPage,
  "/transactions": TransactionsPage,
  "/watchlist": WatchlistPage,
  "/performance": PerformancePage,
  "/dividends": DividendsPage,
  "/real-estate": RealEstatePage,
  "/businesses": BusinessesPage,
  "/clients": ClientsPage,
  "/loans": LoansPage,
  "/projection": ProjectionPage,
  "/wedding": WeddingPage,
};

/** Hrefs that may be put behind a share link (drives the management UI too). */
export const SHAREABLE_HREFS = Object.keys(SHAREABLE_TABS);

/** Resolve a /share/[token]/<...slug> segment list to a nav href, or null. */
export function slugToHref(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "/";
  return "/" + slug.join("/");
}
