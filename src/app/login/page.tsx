"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/nw/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/dashboard";
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(twoFactor ? { password, code } : { password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.replace(from);
        router.refresh();
        return;
      }
      if (data.twoFactorRequired) {
        // Password accepted — reveal the code step.
        setTwoFactor(true);
        setError(res.ok ? null : (data.error ?? "Enter your authentication code"));
        setLoading(false);
        return;
      }
      setError(data.error ?? "Login failed");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="relative w-full max-w-sm">
        <div className="pointer-events-none absolute -inset-x-10 -top-20 h-40 rounded-full bg-accent/20 blur-3xl" />
        <form
          onSubmit={onSubmit}
          className="card relative animate-fade-up p-8"
        >
          <div className="mb-6">
            <Wordmark height={26} className="mb-3" />
            <h1 className="text-xl font-semibold">Enter password</h1>
            <p className="mt-1 text-sm text-ink-muted">
              This dashboard is private.
            </p>
          </div>

          <label className="stat-label mb-2 block" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            readOnly={twoFactor}
            className="focusring w-full rounded-xl border border-border bg-panel px-3 py-2.5 text-ink placeholder:text-ink-faint read-only:opacity-60"
            placeholder="••••••••••••"
          />

          {twoFactor && (
            <div className="mt-4">
              <label className="stat-label mb-2 block" htmlFor="code">
                Authentication code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="focusring mono w-full rounded-xl border border-border bg-panel px-3 py-2.5 tracking-widest text-ink placeholder:text-ink-faint"
                placeholder="123456"
                aria-describedby="code-help"
              />
              <p id="code-help" className="mt-1.5 text-xs text-ink-faint">
                Enter the 6-digit code from your authenticator app, or a backup
                code.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-loss" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              password.length === 0 ||
              (twoFactor && code.trim().length === 0)
            }
            className="focusring mt-5 w-full rounded-xl bg-accent px-4 py-2.5 font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading
              ? "Unlocking…"
              : twoFactor
                ? "Verify & unlock"
                : "Unlock"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
