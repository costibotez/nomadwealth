import type { MetadataRoute } from "next";
import { SITE_URL as base } from "@/lib/site";

// Only canonical 200 URLs belong here — /welcome is a 308 redirect to /, so
// it is deliberately absent (Search Console flags redirecting sitemap URLs).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cockpit`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/demo`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/vs/ghostfolio`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vs/spreadsheet`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/feedback`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
