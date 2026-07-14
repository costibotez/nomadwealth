import type { MetadataRoute } from "next";
import { SITE_URL as base } from "@/lib/site";

/**
 * Only the public marketing routes are crawlable. The dashboard, setup wizard,
 * APIs and share links are disallowed — the app holds private financial data.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/cockpit", "/demo", "/security", "/changelog", "/vs", "/feedback", "/llms.txt"],
      disallow: ["/dashboard", "/setup", "/api/", "/share/", "/login"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
