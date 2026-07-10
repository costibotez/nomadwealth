"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, Check, Copy } from "lucide-react";

type SetupData = { secret: string; otpauthUrl: string; qrDataUrl: string };

export function TwoFactorSettings({
  hasOwner,
  enabled,
  backupRemaining,
}: {
  hasOwner: boolean;
  enabled: boolean;
  backupRemaining: number;
}) {
  const router = useRouter();

  // Enrollment state
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // Disable state
  const [disabling, setDisabling] = useState(false);
  const [disableSecret, setDisableSecret] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);

  if (!hasOwner) {
    return (
      <div className="card max-w-xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="font-semibold text-ink">Two-factor authentication</div>
            <p className="text-xs text-ink-muted">
              This install signs in with an environment password and has no owner
              account, so app-managed 2FA is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function beginSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/2fa/setup", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not start setup.");
        return;
      }
      setSetup({
        secret: data.secret,
        otpauthUrl: data.otpauthUrl,
        qrDataUrl: data.qrDataUrl,
      });
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/2fa/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not enable two-factor.");
        return;
      }
      setBackupCodes(data.backupCodes as string[]);
      setSetup(null);
      setCode("");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setDisableError(null);
    try {
      const res = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Send raw: the server tries it as a code (trimmed) then as the exact
        // password, so either works and long passwords aren't truncated.
        body: JSON.stringify({ secret: disableSecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setDisableError(data.error ?? "Could not disable two-factor.");
        return;
      }
      setDisabling(false);
      setDisableSecret("");
      router.refresh();
    } catch {
      setDisableError("Network error");
    } finally {
      setBusy(false);
    }
  }

  // ── Freshly generated backup codes (shown exactly once) ──────────────────
  if (backupCodes) {
    return (
      <div className="card max-w-xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gain/15 text-gain">
            <Check size={18} />
          </div>
          <div>
            <div className="font-semibold text-ink">Two-factor is on</div>
            <p className="text-xs text-ink-muted">
              Save these backup codes now. Each works once if you lose your
              authenticator. They will not be shown again.
            </p>
          </div>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <li
              key={c}
              className="mono rounded-lg border border-border bg-base px-3 py-2 text-center text-sm tracking-widest text-ink"
            >
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() =>
              navigator.clipboard?.writeText(backupCodes.join("\n")).catch(() => {})
            }
            className="focusring inline-flex items-center gap-2 rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-ink hover:bg-hover"
          >
            <Copy size={15} /> Copy codes
          </button>
          <button
            onClick={() => {
              setBackupCodes(null);
              router.refresh();
            }}
            className="focusring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
          >
            I&apos;ve saved them
          </button>
        </div>
      </div>
    );
  }

  // ── Enabled: show status + disable ───────────────────────────────────────
  if (enabled) {
    return (
      <div className="card max-w-xl p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gain/15 text-gain">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">
                Two-factor authentication
              </span>
              <span className="flex items-center gap-1 rounded-full bg-gain/15 px-2 py-0.5 text-xs text-gain">
                <Check size={12} /> Enabled
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              A code from your authenticator app is required at every login.
              {backupRemaining > 0
                ? ` ${backupRemaining} backup code${backupRemaining === 1 ? "" : "s"} remaining.`
                : " No backup codes remaining."}
            </p>
          </div>
        </div>

        {!disabling ? (
          <button
            onClick={() => setDisabling(true)}
            className="focusring mt-5 rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-loss hover:bg-hover"
          >
            Disable two-factor
          </button>
        ) : (
          <div className="mt-5 border-t border-border pt-4">
            <label htmlFor="disable-secret" className="stat-label mb-2 block">
              Confirm with a current code or your password
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="disable-secret"
                type="password"
                autoComplete="off"
                value={disableSecret}
                onChange={(e) => setDisableSecret(e.target.value)}
                className="focusring min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
                placeholder="123456 or password"
              />
              <button
                onClick={disable}
                disabled={busy || disableSecret.trim().length === 0}
                className="focusring rounded-xl bg-loss px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Disabling…" : "Disable"}
              </button>
              <button
                onClick={() => {
                  setDisabling(false);
                  setDisableSecret("");
                  setDisableError(null);
                }}
                className="focusring rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-ink hover:bg-hover"
              >
                Cancel
              </button>
            </div>
            {disableError && (
              <p role="alert" className="mt-2 text-sm text-loss">
                {disableError}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Disabled: enable flow ────────────────────────────────────────────────
  return (
    <div className="card max-w-xl p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="font-semibold text-ink">Two-factor authentication</div>
          <p className="text-xs text-ink-muted">
            Add a second step at login using any authenticator app (Google
            Authenticator, 1Password, Aegis…). Optional and off by default.
          </p>
        </div>
      </div>

      {!setup ? (
        <>
          <button
            onClick={beginSetup}
            disabled={busy}
            className="focusring mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Preparing…" : "Enable two-factor"}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-sm text-loss">
              {error}
            </p>
          )}
        </>
      ) : (
        <div className="mt-5 border-t border-border pt-5">
          <ol className="space-y-4 text-sm text-ink">
            <li>
              <span className="font-medium">1. Scan this QR code</span> with your
              authenticator app.
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qrDataUrl}
                  alt="Two-factor QR code"
                  width={180}
                  height={180}
                  className="rounded-xl border border-border bg-white p-2"
                />
                <div className="text-xs text-ink-muted">
                  <div className="mb-1">Can&apos;t scan? Enter this key manually:</div>
                  <code className="mono block break-all rounded-lg border border-border bg-base px-2 py-1 text-ink">
                    {setup.secret}
                  </code>
                </div>
              </div>
            </li>
            <li>
              <label htmlFor="enroll-code" className="font-medium">
                2. Enter the 6-digit code
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="enroll-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="focusring mono min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 tracking-widest text-ink placeholder:text-ink-faint"
                  placeholder="123456"
                />
                <button
                  onClick={confirmEnable}
                  disabled={busy || code.trim().length === 0}
                  className="focusring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Verifying…" : "Verify & turn on"}
                </button>
              </div>
            </li>
          </ol>
          {error && (
            <p role="alert" className="mt-3 text-sm text-loss">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
