import { getOwner } from "@/lib/owner";
import { TwoFactorSettings } from "@/components/settings/TwoFactorSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const owner = await getOwner().catch(() => null);
  const backupRemaining = Array.isArray(owner?.backupCodes)
    ? owner!.backupCodes.length
    : 0;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Security</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Protect access to this install. Everything here is stored only in your
          own database — NomadWealth never sees it.
        </p>
      </header>
      <TwoFactorSettings
        hasOwner={Boolean(owner)}
        enabled={Boolean(owner?.totpEnabled)}
        backupRemaining={backupRemaining}
      />
    </div>
  );
}
