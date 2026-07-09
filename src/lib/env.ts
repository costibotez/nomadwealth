/**
 * Centralised, validated access to environment variables.
 * Server-only — never import this from a client component.
 */
import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return v;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  /**
   * Optional fallback password for the original CLI/advanced install path. The
   * setup wizard writes a hashed owner row instead (see lib/owner.ts), which
   * takes precedence at login; this is only used when no owner row exists.
   */
  get DASHBOARD_PASSWORD() {
    return process.env.DASHBOARD_PASSWORD ?? "";
  },
  get SESSION_SECRET() {
    return required("SESSION_SECRET");
  },
  get FX_PROVIDER_URL() {
    return process.env.FX_PROVIDER_URL ?? "https://api.frankfurter.app/latest";
  },
  /** Optional: CoinMarketCap API key for live crypto prices (live-price feature). */
  get CMC_API_KEY() {
    return process.env.CMC_API_KEY ?? "";
  },
  /** Secret that authorises the daily price-refresh cron (Vercel Cron). */
  get CRON_SECRET() {
    return process.env.CRON_SECRET ?? "";
  },
};
