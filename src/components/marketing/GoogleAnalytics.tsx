"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent, onConsentChange, type ConsentValue } from "@/lib/consent";

/**
 * Google Analytics 4 (gtag.js) — vendor marketing analytics ONLY, behind consent.
 *
 * Loads only on the vendor's public marketing pages (rendered from the marketing
 * Footer), and only when NEXT_PUBLIC_GA_ID is set. Buyer self-host installs never
 * set it, so their deployments load nothing — GA never touches a buyer's
 * dashboard, financial data, or even reveals their install.
 *
 * GDPR consent gate: gtag.js is NOT injected until the visitor opts in via the
 * CookieBar (localStorage['nw_consent'] === 'granted'). Decline or no-choice ⇒
 * no scripts, no cookies, no requests. The choice is honored on return visits
 * and can be changed from the footer's "Cookie preferences" link. Consent Mode
 * v2 defaults are set to denied and updated to granted so gtag itself also knows
 * consent was given (ad storage stays denied — the marketing site runs no ads).
 *
 * Set NEXT_PUBLIC_GA_ID to your GA4 Measurement ID (e.g. "G-XXXXXXXXXX"). The
 * data flows into that GA4 property; view it in GA (or wire that property into
 * the admin "Growth & traffic" tab via the GA Data API).
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  const [consent, setConsentState] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setConsentState(readConsent());
    return onConsentChange(() => setConsentState(readConsent()));
  }, []);

  // No GA configured (buyer installs, or vendor pre-GA) → nothing loads, ever.
  if (!id) return null;
  // Not opted in yet (or declined) → do not mount gtag.js.
  if (consent !== "granted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
gtag('js', new Date());
gtag('config', '${id}');
gtag('consent', 'update', {analytics_storage:'granted'});`}
      </Script>
    </>
  );
}
