"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, TextField } from "@/components/nw/primitives";
import { WAITLIST_ENDPOINT } from "@/components/marketing/content";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Pre-launch "Get early access" email capture. Mirrors FeedbackForm: it POSTs
 * only `{ email }` to NEXT_PUBLIC_WAITLIST_ENDPOINT (a hosted form service or
 * the separate admin app's waitlist endpoint) directly from the browser — no
 * vendor backend, no financial data, and nothing lands in this product's Neon.
 *
 * If the endpoint isn't configured (buyer self-host installs, unconfigured
 * previews), the form still renders but submits via a mailto: fallback so no
 * vendor endpoint is contacted and nothing is silently lost.
 */
export function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configured = WAITLIST_ENDPOINT.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!configured) {
      const subject = encodeURIComponent("NomadWealth — early access");
      const body = encodeURIComponent(
        `Please add me to the early-access list.\n\nEmail: ${trimmed}`,
      );
      window.location.href = `mailto:hello@nomadwealth.app?subject=${subject}&body=${body}`;
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage("Something went wrong signing you up. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error — please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-8 text-center"
      >
        <CheckCircle2 size={30} className="text-[color:var(--nw-gain)]" />
        <h3 className="text-[18px] font-semibold text-text">You&apos;re on the list.</h3>
        <p className="max-w-[40ch] text-[14px] text-muted">
          We&apos;ll email you the moment early access opens. No spam, no bank logins,
          ever.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setStatus("idle")}>
          Add another email
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-[520px] flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <label htmlFor="ea-email" className="sr-only">
          Email address
        </label>
        <TextField
          id="ea-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "ea-error" : undefined}
        />
        {status === "error" && errorMessage && (
          <div
            id="ea-error"
            role="alert"
            className="mt-2 flex items-start gap-2 text-[13px] text-[color:var(--nw-loss)]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {!configured && (
          <p className="mt-2 text-[12px] text-dim">
            Early access isn&apos;t wired up on this deployment — signing up will open
            your email client instead.
          </p>
        )}
      </div>
      <Button
        type="submit"
        size="lg"
        className="shrink-0"
        disabled={status === "submitting" || email.trim().length === 0}
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Joining…
          </>
        ) : (
          "Get early access"
        )}
      </Button>
    </form>
  );
}
