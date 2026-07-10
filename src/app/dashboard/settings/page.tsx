import { Download } from "lucide-react";
import { getOwner } from "@/lib/owner";
import { OwnerPasswordSettings } from "@/components/settings/OwnerPasswordSettings";
import { TwoFactorSettings } from "@/components/settings/TwoFactorSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const owner = await getOwner().catch(() => null);
  const backupRemaining = Array.isArray(owner?.backupCodes)
    ? owner!.backupCodes.length
    : 0;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Security and data controls for this install. Everything here is stored only in your
          own database — NomadWealth never sees it.
        </p>
      </header>

      <div className="space-y-6">
        <OwnerPasswordSettings hasOwner={Boolean(owner)} />

        <TwoFactorSettings
          hasOwner={Boolean(owner)}
          enabled={Boolean(owner?.totpEnabled)}
          backupRemaining={backupRemaining}
        />

        <NotificationSettings />

        <div className="card max-w-xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Download size={18} />
          </div>
          <div>
            <div className="font-semibold text-ink">Export your data</div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Download everything you own — holdings, property, loans, businesses, clients,
              income and more — as a single JSON file. Great for backups or moving installs.
            </p>
          </div>
        </div>
        <a
          href="/api/export"
          download
          className="focusring mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
        >
          <Download size={16} /> Download export (.json)
        </a>
        </div>
      </div>
    </div>
  );
}
