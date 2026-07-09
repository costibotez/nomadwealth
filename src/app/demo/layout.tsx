import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReadonlyProvider } from "@/components/ReadonlyContext";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { STRIPE_SELFHOST_URL } from "@/components/marketing/content";

// Public, fabricated-data walkthrough — indexable, unlike the private /share links.
export const metadata: Metadata = {
  title: "Live demo",
  description: "Click around NomadWealth with sample data — no signup required.",
  alternates: { canonical: "/demo" },
  robots: { index: true, follow: true },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReadonlyProvider value={true}>
      <CurrencyProvider>
        <div className="flex min-h-screen">
          <DemoSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-base/80 px-4 pl-16 backdrop-blur lg:px-6 lg:pl-6">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                <PlayCircle size={15} className="text-accent" />
                Live demo · sample data, not a real account
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={STRIPE_SELFHOST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focusring hidden rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-black transition hover:brightness-110 sm:block"
                >
                  Buy license — €149
                </a>
                <ThemeToggle />
                <CurrencySwitcher />
              </div>
            </header>
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </CurrencyProvider>
    </ReadonlyProvider>
  );
}
