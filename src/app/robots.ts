import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app").replace(/\/+$/, "");

/**
 * Only the public marketing routes are crawlable. The dashboard, setup wizard,
 * APIs and share links are disallowed — the app holds private financial data.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/welcome", "/cockpit", "/demo", "/security", "/changelog", "/feedback", "/llms.txt"],
      disallow: ["/dashboard", "/setup", "/api/", "/share/", "/login"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
