/**
 * Client-side analytics-consent store — vendor marketing pages ONLY.
 *
 * The vendor's public marketing site can load Google Analytics (see
 * GoogleAnalytics.tsx), which sets cookies and shares data with Google. Under
 * GDPR that requires opt-in consent BEFORE any tracker fires. This tiny store
 * records the visitor's choice in localStorage and lets the consent gate
 * (CookieBar) and the GA loader talk to each other without a shared React
 * context ancestor (the marketing pages are server components).
 *
 * This has nothing to do with buyer self-host installs: GA is env-gated on
 * NEXT_PUBLIC_GA_ID, which buyers never set, so none of this ever runs there —
 * and it never touches dashboard or financial data.
 */
export type ConsentValue = "granted" | "denied";

const STORAGE_KEY = "nw_consent";
/** Fired when the stored choice changes (Accept / Decline). */
const CHANGE_EVENT = "nw:consent-change";
/** Fired to re-open the consent gate so the visitor can change their choice. */
const OPEN_EVENT = "nw:consent-open";

/** Read the persisted choice, or null if the visitor hasn't decided yet. */
export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Persist the choice and notify listeners (GA loader, gate) in this tab. */
export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore (private mode / disabled storage) */
  }
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

/** Ask the consent gate to re-open so the visitor can revise their choice. */
export function openConsentPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(OPEN_EVENT));
  } catch {
    /* ignore */
  }
}

/** Subscribe to consent changes (this tab + other tabs). Returns unsubscribe. */
export function onConsentChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Subscribe to "re-open the gate" requests. Returns unsubscribe. */
export function onConsentOpen(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}
