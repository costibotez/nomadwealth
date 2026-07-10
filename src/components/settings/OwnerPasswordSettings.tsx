"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check } from "lucide-react";

/**
 * Settings → Account password. Rotates the owner password after setup (there is
 * no other in-app path once the wizard is configured). When the install is still
 * on the env DASHBOARD_PASSWORD fallback, setting a password here creates the
 * owner row — which retires the env password and unlocks 2FA in the card below.
 */
export function OwnerPasswordSettings({ hasOwner }: { hasOwner: boolean }) {
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= 8 && next === confirm && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      // Refresh so the 2FA card re-reads hasOwner if an owner row was just created.
      router.refresh();
    } catch {
      setError("Network error");
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
          <div className="font-semibold text-ink">Account password</div>
          <p className="text-xs text-ink-muted">
            {hasOwner
              ? "Change the password you use to sign in to this install."
              : "This install still signs in with an environment password. Set an owner password to retire it — this also unlocks two-factor below."}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="current-password" className="stat-label mb-1.5 block">
            {hasOwner ? "Current password" : "Current environment password"}
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="focusring w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="stat-label mb-1.5 block">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="focusring w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="stat-label mb-1.5 block">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="focusring w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
            placeholder="Re-enter new password"
          />
          {mismatch && (
            <p className="mt-1.5 text-xs text-loss">Passwords don&apos;t match.</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="focusring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving…" : hasOwner ? "Change password" : "Set owner password"}
        </button>
        {done && (
          <span className="flex items-center gap-1.5 text-sm text-gain">
            <Check size={15} /> Password updated
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-loss">
          {error}
        </p>
      )}
    </div>
  );
}
