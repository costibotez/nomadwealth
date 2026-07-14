import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { hasValidSession } from "@/lib/auth-actions";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { TrialBanner } from "@/components/license/TrialBanner";
import { ensureSchemaCurrent } from "@/lib/ensure-migrated";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Apply any migrations added since this install was set up (the setup wizard
  // can't — it 403s once configured). Cached per instance; no-ops when current.
  await ensureSchemaCurrent();

  // Middleware already checked signature + expiry, but it runs at the edge and
  // cannot see the owner's session generation. Enforce revocation ("log out
  // all devices", password/2FA changes) here, where the DB is available.
  if (!(await hasValidSession())) redirect("/login");

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
