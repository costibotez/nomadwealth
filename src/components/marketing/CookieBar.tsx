"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { readConsent, setConsent, onConsentOpen } from "@/lib/consent";

/**
 * Cookie bar for the vendor marketing site.
 *
 * Two modes, decided at build time by whether GA is configured:
 *
 * - GA configured (NEXT_PUBLIC_GA_ID set): a genuine GDPR consent GATE. Google
 *   Analytics does not load until the visitor clicks Accept; Decline keeps it
 *   off for good. The choice persists (localStorage['nw_consent']) and is
 *   honored on return visits — the gate only re-appears if the visitor re-opens
 *   it from the footer's "Cookie preferences" link.
 * - GA not configured (buyer self-host installs, or vendor pre-GA): there are no
 *   trackers, so the bar is purely informational and simply dismissible.
 *
 * Nothing here ever touches dashboard or financial data.
 */
const GA_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_GA_ID);
const INFO_DISMISS_KEY = "nw_cookie";

export function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (GA_CONFIGURED) {
      // Consent gate: prompt only if the visitor hasn't decided yet.
      if (readConsent() === null) setVisible(true);
      // Allow re-opening the gate to change a prior choice.
      return onConsentOpen(() => setVisible(true));
    }
    // Informational: show until dismissed.
    try {
      if (localStorage.getItem(INFO_DISMISS_KEY) !== "1") setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  if (GA_CONFIGURED) {
    const choose = (value: "granted" | "denied") => {
      setConsent(value);
      setVisible(false);
    };
    return (
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed inset-x-0 bottom-4 z-50 px-4"
      >
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-card border border-line-strong bg-surface/95 px-4 py-3 backdrop-blur-md">
          <p className="flex items-center gap-2.5 text-[13px] text-text-2">
            <Cookie size={16} className="shrink-0 text-brand" aria-hidden="true" />
            <span>
              We use analytics cookies on this marketing site only with your
              consent. Your dashboard and financial data are never touched.
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="rounded-btn border border-btn bg-[color:var(--chip)] px-3 py-1.5 text-[13px] text-text hover:bg-[color:var(--hair)]"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="rounded-btn bg-brand px-3 py-1.5 text-[13px] font-semibold text-brand-on hover:brightness-[1.06]"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Informational mode: no analytics configured, only the essential session cookie.
  const dismiss = () => {
    try {
      localStorage.setItem(INFO_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };
  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-4 z-50 px-4"
    >
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-card border border-line-strong bg-surface/95 px-4 py-3 backdrop-blur-md">
        <p className="flex items-center gap-2.5 text-[13px] text-text-2">
          <Cookie size={16} className="shrink-0 text-brand" aria-hidden="true" />
          <span>Only an essential session cookie — no trackers, no analytics on your data.</span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-btn bg-brand px-3 py-1.5 text-[13px] font-semibold text-brand-on hover:brightness-[1.06]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
