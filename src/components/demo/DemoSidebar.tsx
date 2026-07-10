"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Menu, PlayCircle, X } from "lucide-react";
import { NAV } from "@/config/nav";

/**
 * Sidebar for the public /demo route. Same pattern as ShareSidebar, but the
 * tab list is fixed (not driven by a share link) and hrefs live under /demo.
 */
const DEMO_TABS = [
  { href: "/demo", label: "Overview", navHref: "/dashboard" },
  { href: "/demo/holdings", label: "Holdings", navHref: "/dashboard/holdings" },
  { href: "/demo/transactions", label: "Transactions", navHref: "/dashboard/transactions" },
  { href: "/demo/watchlist", label: "Watchlist", navHref: "/dashboard/watchlist" },
  { href: "/demo/performance", label: "Performance", navHref: "/dashboard/performance" },
  { href: "/demo/dividends", label: "Dividends", navHref: "/dashboard/dividends" },
  { href: "/demo/real-estate", label: "Real Estate", navHref: "/dashboard/real-estate" },
  { href: "/demo/loans", label: "Loans", navHref: "/dashboard/loans" },
  { href: "/demo/businesses", label: "Businesses", navHref: "/dashboard/businesses" },
  { href: "/demo/clients", label: "Clients", navHref: "/dashboard/clients" },
  { href: "/demo/import", label: "Import", navHref: "/dashboard/import" },
  { href: "/demo/projection", label: "FIRE / Projection", navHref: "/dashboard/projection" },
];

function navIconFor(navHref: string) {
  return NAV.find((n) => n.href === navHref)?.icon;
}

function DemoNavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-2">
      {DEMO_TABS.map(({ href, label, navHref }) => {
        const active = href === "/demo" ? pathname === "/demo" : pathname.startsWith(href);
        const Icon = navIconFor(navHref) ?? PlayCircle;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={`focusring group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
              active
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:bg-hover hover:text-ink"
            }`}
          >
            <Icon
              size={18}
              className={active ? "text-accent" : "text-ink-faint group-hover:text-ink"}
            />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function DemoSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="focusring fixed left-4 top-4 z-40 rounded-xl border border-border bg-panel p-2 text-ink-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-panel py-4 transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <div className="mb-4 flex items-center justify-between px-4">
          {!collapsed && (
            <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <PlayCircle size={15} className="text-accent" /> Demo
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="focusring rounded-lg p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              size={18}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        <DemoNavLinks collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 animate-fade-up flex-col border-r border-border bg-panel py-4">
            <div className="mb-4 flex items-center justify-between px-4">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <PlayCircle size={15} className="text-accent" /> Demo
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="focusring rounded-lg p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <DemoNavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
