import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getLicenseStatus, isTrial } from "@/lib/license-status";

/** Non-blocking banner shown while running unlicensed/trial. */
export async function TrialBanner() {
  const status = await getLicenseStatus();
  if (!isTrial(status)) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-ink">
        <KeyRound size={15} className="text-accent" />
        <span>
          You&apos;re on a <strong>trial</strong> — every feature is unlocked.
          Activate a license to support NomadWealth.
        </span>
      </div>
      <Link
        href="/dashboard/license"
        className="focusring rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black transition hover:brightness-110"
      >
        Activate license
      </Link>
    </div>
  );
}
