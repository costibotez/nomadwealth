import type { MetadataRoute } from "next";

/**
 * Web app manifest → makes NomadWealth installable as a PWA (Add to Home Screen /
 * install app). Next serves this at /manifest.webmanifest and auto-links it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NomadWealth",
    short_name: "NomadWealth",
    description: "Your entire net worth — self-hosted and private.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    icons: [
      { src: "/logo-mark.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo-mark.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
