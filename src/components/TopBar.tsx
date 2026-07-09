"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV } from "@/config/nav";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { AlertBell } from "./AlertBell";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const pathname = usePathname();
  const current =
    NAV.find((n) =>
      n.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.href),
    )?.label ?? "Overview";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-base/80 px-4 pl-16 backdrop-blur lg:px-6 lg:pl-6">
      <h1 className="text-base font-semibold tracking-tight">{current}</h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AlertBell />
        <CurrencySwitcher />
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            title="Log out"
            className="focusring rounded-xl border border-border bg-panel p-2 text-ink-faint hover:bg-hover hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
