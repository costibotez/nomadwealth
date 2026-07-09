import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The xlsx package is only used by the local import script, never bundled
  // into the deployed app. Keep server externals clean.
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
