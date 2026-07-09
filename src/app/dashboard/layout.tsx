import { Suspense } from "react";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { TrialBanner } from "@/components/license/TrialBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrencyProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
            {/* License state must never block the app — render lazily. */}
            <Suspense fallback={null}>
              <TrialBanner />
            </Suspense>
            {children}
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
