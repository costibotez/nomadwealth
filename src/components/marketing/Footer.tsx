import Link from "next/link";
import { Wordmark } from "@/components/nw/Logo";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { CookieBar } from "./CookieBar";
import { CookiePreferencesLink } from "./CookiePreferencesLink";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line">
      <GoogleAnalytics />
      <CookieBar />
      <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-9 px-7 pb-8 pt-14 sm:grid-cols-2 lg:grid-cols-3">
        <div className="max-w-[34ch]">
          <Wordmark height={26} />
          <p className="mt-3.5 text-[13px] leading-relaxed text-muted">
            Self-hosted personal net-worth &amp; investment cockpit. Your data,
            your keys, your infrastructure — we literally can&apos;t see it.
          </p>
        </div>
        <div>
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">
            Product
          </div>
          <ul className="space-y-2.5 text-[14px]">
            {[
              ["Overview", "/"],
              ["Cockpit", "/cockpit"],
              ["Changelog", "/changelog"],
              ["Setup wizard", "/setup"],
              ["Pricing", "/#pricing"],
            ].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-text-2 transition-colors hover:text-brand">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-dim">
            Support &amp; Legal
          </div>
          <ul className="space-y-2.5 text-[14px]">
            {[
              ["Feedback & Support", "/feedback"],
              ["Security & Privacy", "/security"],
              ["Privacy Policy", "/security"],
              ["License (EULA)", "/security#license"],
              ["Sitemap", "/sitemap.xml"],
            ].map(([l, h]) => (
              <li key={l}>
                <Link href={h} className="text-text-2 transition-colors hover:text-brand">
                  {l}
                </Link>
              </li>
            ))}
            <CookiePreferencesLink />
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-2 px-7 py-5 text-[13px] text-dim">
          <span>© 2026 NomadWealth. All rights reserved.</span>
          <span>
            Created with ♥ by{" "}
            <a
              href="https://nomad-developer.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-2 transition-colors hover:text-brand"
            >
              Nomad-Developer
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
