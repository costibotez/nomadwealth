import type { MetadataRoute } from "next";

// Strip any trailing slash so `${base}/path` never doubles up (//).
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/welcome`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/cockpit`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/demo`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/vs/ghostfolio`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vs/spreadsheet`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/feedback`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
