"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, TextField, SegmentedNav } from "@/components/nw/primitives";
import { FEEDBACK_ENDPOINT } from "@/components/marketing/content";

type Intent = "support" | "feature" | "feedback";

const INTENTS: { value: Intent; label: string; placeholder: string }[] = [
  {
    value: "support",
    label: "Get support",
    placeholder: "What are you stuck on? Include your NomadWealth version and what you've already tried.",
  },
  {
    value: "feature",
    label: "Request a feature",
    placeholder: "What would you like NomadWealth to do?",
  },
  {
    value: "feedback",
    label: "Share feedback",
    placeholder: "What's working well, or what would you change? Anything goes.",
  },
];

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Feedback & Support form — one form, three intents (support / feature /
 * feedback), all of which submit a message.
 *
 * POSTs to NEXT_PUBLIC_FEEDBACK_ENDPOINT (the admin app's /api/feedback endpoint)
 * directly from the browser — no financial data collected or collectible (just
 * intent, an optional email, and free-text message). If the endpoint isn't
 * configured (buyer self-host installs, unconfigured previews), the form still
 * renders but submits via a mailto: fallback so nothing is silently lost.
 */
export function FeedbackForm() {
  const [intent, setIntent] = useState<Intent>("support");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const active = INTENTS.find((i) => i.value === intent) ?? INTENTS[0];
  const configured = FEEDBACK_ENDPOINT.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    if (!configured) {
      const subject = encodeURIComponent(`NomadWealth ${active.label}`);
      const body = encodeURIComponent(
        `${message}${email ? `\n\nReply to: ${email}` : ""}`,
      );
      window.location.href = `mailto:hello@nomadwealth.app?subject=${subject}&body=${body}`;
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ intent, email: email || undefined, message }),
      });
      if (res.ok) {
        setStatus("success");
        setMessage("");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage("Something went wrong sending that. Please try again.");
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
        className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-10 text-center"
      >
        <CheckCircle2 size={32} className="text-[color:var(--nw-gain)]" />
        <h2 className="text-[18px] font-semibold">Thanks — got it.</h2>
        <p className="max-w-[42ch] text-[14px] text-muted">
          We read every message. If you left an email, we'll follow up there.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setStatus("idle")}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-line bg-surface p-6 sm:p-8">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-dim">
        What's this about?
      </div>
      <SegmentedNav
        ariaLabel="What's this about?"
        options={INTENTS.map(({ value, label }) => ({ value, label }))}
        value={intent}
        onChange={(v) => setIntent(v as Intent)}
      />

      <div className="mt-5">
            <label htmlFor="fb-email" className="mb-2 block text-[13px] font-medium text-text-2">
              Email <span className="text-dim">(optional — leave blank to stay anonymous)</span>
            </label>
            <TextField
              id="fb-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mt-5">
            <label htmlFor="fb-message" className="mb-2 block text-[13px] font-medium text-text-2">
              Message
            </label>
            <textarea
              id="fb-message"
              required
              rows={6}
              placeholder={active.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-y rounded-md border border-line-strong bg-input px-3.5 py-3 text-[14px] text-text placeholder:text-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]"
            />
            <p className="mt-1.5 text-[12px] text-dim">
              Please don't include account numbers, balances, or other financial figures —
              we only need enough detail to help.
            </p>
          </div>

          {status === "error" && errorMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-[color:var(--nw-loss)] bg-[rgba(239,107,107,0.1)] px-3.5 py-3 text-[13px] text-[color:var(--nw-loss)]" role="alert">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!configured && (
            <p className="mt-4 text-[12px] text-dim">
              The hosted form isn't configured on this deployment yet — sending will open your
              email client instead.
            </p>
          )}

          <Button
            type="submit"
            className="mt-6 w-full sm:w-auto"
            disabled={status === "submitting" || message.trim().length === 0}
          >
            {status === "submitting" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending…
              </>
            ) : (
              "Send message"
            )}
          </Button>
    </form>
  );
}
