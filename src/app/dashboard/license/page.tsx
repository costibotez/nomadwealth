import { getLicenseStatus } from "@/lib/license-status";
import { LicenseCard } from "@/components/license/LicenseCard";
import { db } from "@/db";
import { appConfig } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getShareActivation(): Promise<boolean> {
  try {
    const rows = await db.select({ share: appConfig.shareActivation }).from(appConfig).limit(1);
    return Boolean(rows[0]?.share);
  } catch {
    return false;
  }
}

export default async function LicensePage() {
  const [status, shareActivation] = await Promise.all([
    getLicenseStatus(),
    getShareActivation(),
  ]);
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">License</h1>
        <p className="mt-1 text-sm text-ink-muted">
          NomadWealth runs entirely on your own infrastructure. Activation is
          verified offline — no financial data ever leaves this install.
        </p>
      </header>
      <LicenseCard initial={status} shareActivation={shareActivation} />
    </div>
  );
}
