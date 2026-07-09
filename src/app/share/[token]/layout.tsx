import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ReadonlyProvider } from "@/components/ReadonlyContext";
import { ShareSidebar } from "@/components/share/ShareSidebar";
import { getValidShareLink } from "@/lib/share";

export const dynamic = "force-dynamic";

// Shared links must never be indexed by search engines.
export const metadata = { robots: { index: false, follow: false } };

export default async function ShareLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Validate without touching last_viewed_at — the page records the view.
  const link = await getValidShareLink(token, { touch: false });
  if (!link) notFound();

  return (
    <ReadonlyProvider value={true}>
      <CurrencyProvider>
        <div className="flex min-h-screen">
          <ShareSidebar token={token} allowedTabs={link.allowedTabs} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-base/80 px-4 pl-16 backdrop-blur lg:px-6 lg:pl-6">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
                <Eye size={15} className="text-accent" />
                View only{link.label ? ` · ${link.label}` : ""}
              </span>
              <div className="flex items-center gap-2">
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
