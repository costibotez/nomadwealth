import type { NextConfig } from "next";

// Applied to every route. CSP notes:
//  - script-src needs 'unsafe-inline' for Next's inline bootstrap scripts and
//    the pre-paint theme snippet in layout.tsx; external script origins are
//    still blocked, which is the main injection/exfil surface.
//  - connect-src is 'self': FX/price providers are called server-side only.
//  - frame-ancestors 'none' (+ X-Frame-Options) blocks clickjacking on the
//    financial dashboard, including the public /share and /demo pages.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The xlsx package is only used by the local import script, never bundled
  // into the deployed app. Keep server externals clean.
  serverExternalPackages: ["@neondatabase/serverless"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
