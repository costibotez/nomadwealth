"use client";

import { openConsentPreferences } from "@/lib/consent";

/**
 * Footer affordance to re-open the analytics-consent gate so a visitor can
 * change a prior Accept/Decline choice. Only meaningful when GA is configured
 * (buyer self-host installs set no NEXT_PUBLIC_GA_ID, so there's nothing to
 * manage) — renders nothing otherwise.
 */
export function CookiePreferencesLink() {
  if (!process.env.NEXT_PUBLIC_GA_ID) return null;
  return (
    <li>
      <button
        type="button"
        onClick={() => openConsentPreferences()}
        className="text-text-2 transition-colors hover:text-brand"
      >
        Cookie preferences
      </button>
    </li>
  );
}
