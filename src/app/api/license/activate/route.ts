import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { license, appConfig } from "@/db/schema";
import { sql } from "drizzle-orm";
import { verifyLicenseKey, remoteKeyCheck } from "@/lib/license";
import { isUnconfigured, verifySetupToken } from "@/lib/setup-guard";
import { pingActivation } from "@/lib/activation-ping";

export const runtime = "nodejs";

const schema = z.object({ key: z.string().max(4096) });

/**
 * Activates a license. Verification is OFFLINE (Ed25519) — no financial data
 * ever leaves the install. The activation state is stored in the buyer's DB.
 */
export async function POST(req: Request) {
  // Allowed during first-run setup; also usable later to upgrade a trial
  // (post-setup, middleware requires an owner session for this path).
  if ((await isUnconfigured()) && !verifySetupToken(req)) {
    return NextResponse.json(
      { valid: false, error: "Setup token required" },
      { status: 403 },
    );
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Key required" }, { status: 400 });
  }

  const key = parsed.data.key;
  const offline = await verifyLicenseKey(key);
  const result = await remoteKeyCheck(key, offline);

  if (!result.valid) {
    return NextResponse.json(
      { valid: false, tier: result.tier, error: result.error },
      { status: 200 },
    );
  }

  // Persist the singleton license row. Skipped only if the schema is not yet
  // migrated (shouldn't happen: license step follows the DB step).
  try {
    await db
      .insert(license)
      .values({
        id: 1,
        key,
        tier: result.tier,
        updatesUntil: result.updatesUntil ? new Date(result.updatesUntil) : null,
      })
      .onConflictDoUpdate({
        target: license.id,
        set: {
          key,
          tier: result.tier,
          activatedAt: sql`now()`,
          updatesUntil: result.updatesUntil ? new Date(result.updatesUntil) : null,
        },
      });
  } catch (err) {
    console.error("license activation save failed:", err);
    return NextResponse.json(
      {
        valid: false,
        tier: result.tier,
        error:
          "Verified, but could not save activation — run the database step first.",
      },
      { status: 200 },
    );
  }

  // Opt-in, opaque activation ping (hashed key + tier only). Never blocks.
  try {
    const cfg = await db
      .select({ share: appConfig.shareActivation })
      .from(appConfig)
      .limit(1);
    if (cfg[0]?.share) {
      await pingActivation(key, result.tier, result.updatesUntil ?? null);
    }
  } catch {
    /* config not present yet (first-run) — nothing to share */
  }

  return NextResponse.json({
    valid: true,
    tier: result.tier,
    updatesUntil: result.updatesUntil,
  });
}

