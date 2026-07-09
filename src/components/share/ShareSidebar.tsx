"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Eye, Menu, X } from "lucide-react";
import { NAV } from "@/config/nav";
import { SHAREABLE_TABS } from "@/config/share-tabs";

// NAV items live under /dashboard/*; share hrefs are unprefixed (e.g. "/holdings").
// Map a share href to its NAV entry to reuse the same icon.
function navIconFor(shareHref: string) {
  const dashboardHref = shareHref === "/" ? "/dashboard" : `/dashboard${shareHref}`;
  return NAV.find((n) => n.href === dashboardHref)?.icon;
}

/**
 * Sidebar for the read-only shared view. Mirrors the main Sidebar but only shows
 * the tabs the share link is allowed to expose, and links into the /share/[token]
 * namespace. No logout / settings.
 */
function shareHref(token: string, href: string): string {
  return href === "/" ? `/share/${token}` : `/share/${token}${href}`;
}

function ShareNavLinks({
  token,
  allowedTabs,
  collapsed,
  onNavigate,
}: {
  token: string;
  allowedTabs: string[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = SHAREABLE_TABS.filter((t) => allowedTabs.includes(t.href));
  return (
    <nav className="flex flex-1 flex-col gap-1 px-2">
      {items.map(({ href, label }) => {
        const target = shareHref(token, href);
        const active =
          href === "/" ? pathname === `/share/${token}` : pathname.startsWith(target);
        const Icon = navIconFor(href) ?? Eye;
        return (
          <Link
            key={href}
            href={target}
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

export function ShareSidebar({
  token,
  allowedTabs,
}: {
  token: string;
  allowedTabs: string[];
}) {
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
              <Eye size={15} className="text-accent" /> Shared view
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
        <ShareNavLinks token={token} allowedTabs={allowedTabs} collapsed={collapsed} />
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
                <Eye size={15} className="text-accent" /> Shared view
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="focusring rounded-lg p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <ShareNavLinks
              token={token}
              allowedTabs={allowedTabs}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
