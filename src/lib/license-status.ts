/**
 * Reads the activated license from the buyer's DB. Used to show a graceful
 * trial/unlicensed state in the app. Never phones home.
 */
import "server-only";
import { db } from "@/db";
import { license } from "@/db/schema";

export interface LicenseStatus {
  tier: "self-host" | "updates" | "trial" | "none";
  activatedAt: string | null;
  updatesUntil: string | null;
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  try {
    const rows = await db.select().from(license).limit(1);
    const row = rows[0];
    if (!row) return { tier: "none", activatedAt: null, updatesUntil: null };
    return {
      tier: (row.tier as LicenseStatus["tier"]) ?? "trial",
      activatedAt: row.activatedAt ? new Date(row.activatedAt).toISOString() : null,
      updatesUntil: row.updatesUntil ? new Date(row.updatesUntil).toISOString() : null,
    };
  } catch {
    return { tier: "none", activatedAt: null, updatesUntil: null };
  }
}

export function isTrial(status: LicenseStatus): boolean {
  return status.tier === "trial" || status.tier === "none";
}
