/**
 * Canonical site origin — the single source of truth for every absolute URL
 * (metadataBase, sitemap, robots, JSON-LD). Non-www is canonical; keep
 * public/llms.txt in sync if this ever changes.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app"
).replace(/\/+$/, "");
