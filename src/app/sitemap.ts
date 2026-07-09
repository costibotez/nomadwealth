import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cockpit`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/feedback`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
