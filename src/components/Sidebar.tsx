"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Menu, X } from "lucide-react";
import { NAV } from "@/config/nav";
import { Wordmark, LogoMark } from "@/components/nw/Logo";

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
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

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="focusring fixed left-4 top-4 z-40 rounded-xl border border-border bg-panel p-2 text-ink-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-panel py-4 transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <div
          className={`mb-4 flex px-4 ${
            collapsed ? "flex-col items-center gap-3 px-0" : "items-center justify-between"
          }`}
        >
          <Link href="/dashboard" aria-label="NomadWealth" className="focusring shrink-0 rounded">
            {collapsed ? <LogoMark size={26} /> : <Wordmark height={24} />}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="focusring shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              size={18}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        <NavLinks collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 animate-fade-up flex-col border-r border-border bg-panel py-4">
            <div className="mb-4 flex items-center justify-between px-4">
              <Link href="/dashboard" aria-label="NomadWealth" className="focusring rounded">
                <Wordmark height={24} />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="focusring rounded-lg p-1.5 text-ink-faint hover:bg-hover hover:text-ink"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
