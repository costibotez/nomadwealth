"use client";

import { useState } from "react";
import { KeyRound, Check } from "lucide-react";
import type { LicenseStatus } from "@/lib/license-status";
import { updatesEntitlement } from "@/lib/updates-entitlement";
import { STRIPE_SELFHOST_URL, STRIPE_RENEW_URL } from "@/components/marketing/content";

const TIER_LABEL: Record<string, string> = {
  "self-host": "Self-host license",
  updates: "License + updates",
  trial: "Trial",
  none: "Unlicensed",
};

export function LicenseCard({
  initial,
  shareActivation = false,
}: {
  initial: LicenseStatus;
  shareActivation?: boolean;
}) {
  const [status, setStatus] = useState(initial);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState(shareActivation);
  const [sharePending, setSharePending] = useState(false);

  async function toggleShare() {
    const next = !share;
    setShare(next);
    setSharePending(true);
    try {
      const res = await fetch("/api/settings/activation-sharing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      }).then((r) => r.json());
      if (!res.ok) setShare(!next); // revert on failure
    } catch {
      setShare(!next);
    } finally {
      setSharePending(false);
    }
  }

  const trial = status.tier === "trial" || status.tier === "none";
  const ent = updatesEntitlement(status.tier, status.updatesUntil);
  const untilDate = status.updatesUntil
    ? new Date(status.updatesUntil).toLocaleDateString()
    : null;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      }).then((r) => r.json());
      if (!res.valid) {
        setError(res.error ?? "Could not activate that key.");
        return;
      }
      setStatus({
        tier: res.tier,
        activatedAt: new Date().toISOString(),
        updatesUntil: res.updatesUntil ?? null,
      });
      setKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-xl p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <KeyRound size={18} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{TIER_LABEL[status.tier]}</span>
            {!trial && (
              <span className="flex items-center gap-1 rounded-full bg-gain/15 px-2 py-0.5 text-xs text-gain">
                <Check size={12} /> Active
              </span>
            )}
            {ent.state === "expiring" && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                Updates renew soon
              </span>
            )}
            {ent.state === "expired" && (
              <span className="rounded-full bg-loss/15 px-2 py-0.5 text-xs text-loss">
                Updates expired
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted">
            {trial
              ? "All features are available. Enter a license key to activate permanently."
              : ent.state === "expired"
                ? `Updates expired ${untilDate} — the app keeps working; renew to get new versions.`
                : ent.state === "expiring"
                  ? `Updates active — expire in ${ent.daysRemaining} day${ent.daysRemaining === 1 ? "" : "s"} (${untilDate}). Renew to keep getting new versions.`
                  : ent.state === "active"
                    ? `Updates active until ${untilDate}.`
                    : "Thanks for supporting NomadWealth."}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="license-key" className="stat-label mb-2 block">
          License key
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="license-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="NW1.xxxxxxxx…"
            className="focusring min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint"
          />
          <button
            onClick={activate}
            disabled={busy || key.trim().length === 0}
            className="focusring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Activating…" : "Activate"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-loss">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
          {trial ? (
            <a
              href={STRIPE_SELFHOST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Buy a license — €149 →
            </a>
          ) : (
            <a
              href={STRIPE_RENEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Renew updates — €59/yr →
            </a>
          )}
          <span className="text-ink-faint">
            After paying, your license key arrives by email — paste it above.
          </span>
        </div>

        {/* Opt-in, opaque activation sharing (default off). */}
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-border pt-4">
          <div>
            <div className="text-sm font-medium text-ink">Share anonymous activation status</div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Off by default. If on, sends only a <em>hashed</em> key + tier to NomadWealth on
              activation — never your financial data. Helps us support the product.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={share}
            aria-label="Share anonymous activation status"
            onClick={toggleShare}
            disabled={sharePending}
            className={
              "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors " +
              (share ? "bg-accent" : "bg-border")
            }
          >
            <span
              className={
                "h-5 w-5 rounded-full bg-white shadow-sm transition-transform " +
                (share ? "translate-x-5" : "translate-x-0")
              }
            />
          </button>
        </div>
      </div>
    </div>
  );
}
