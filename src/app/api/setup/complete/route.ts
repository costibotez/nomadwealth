import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { appConfig, license } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getOwner } from "@/lib/owner";
import { isUnconfigured, resolveDatabaseUrl } from "@/lib/setup-guard";
import { clearSetupStateCache } from "@/lib/setup-state";
import { verifyLicenseKey, remoteKeyCheck, licenseAllowsSetupCompletion } from "@/lib/license";
import { SCHEMA_VERSION } from "@/db/migrations.generated";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({ displayCurrency: z.string().length(3).optional() });

/**
 * Finalizes first-run setup: records app_config, then signs the owner session
 * so the user lands in the dashboard already authenticated.
 */
export async function POST(req: Request) {
  if (!(await isUnconfigured())) {
    return NextResponse.json({ ok: false, error: "Already configured" }, { status: 403 });
  }
  if (!(await getOwner())) {
    return NextResponse.json(
      { ok: false, error: "Set an owner password before finishing." },
      { status: 400 },
    );
  }
  // Require a VALID, signed, non-trial license to finish setup. We re-verify the
  // stored key's Ed25519 signature here (not just trust a stored tier), so a
  // manually-inserted license row or an empty/trial key cannot complete setup.
  // Forge-proof: only the vendor's private key can sign a valid non-trial key.
  {
    const rows = await db.select({ key: license.key }).from(license).limit(1);
    const key = rows[0]?.key ?? "";
    const result = await remoteKeyCheck(key, await verifyLicenseKey(key));
    if (!licenseAllowsSetupCompletion(result)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A valid license key is required to finish setup. Activate the key emailed after your purchase in the License step.",
        },
        { status: 400 },
      );
    }
  }
  if (!resolveDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not configured." },
      { status: 400 },
    );
  }
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SESSION_SECRET is not set. Add it in your environment, then finish setup.",
      },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const displayCurrency = parsed.success ? parsed.data.displayCurrency : undefined;

  try {
    await db
      .insert(appConfig)
      .values({
        id: 1,
        schemaVersion: SCHEMA_VERSION,
        setupCompletedAt: sql`now()`,
        displayCurrency: displayCurrency ?? "EUR",
      })
      .onConflictDoUpdate({
        target: appConfig.id,
        set: {
          schemaVersion: SCHEMA_VERSION,
          setupCompletedAt: sql`now()`,
          ...(displayCurrency ? { displayCurrency } : {}),
          updatedAt: sql`now()`,
        },
      });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }

  clearSetupStateCache();

  const token = await signSession(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  // Fast-path cookie so edge middleware can skip the DB check post-setup.
  res.cookies.set("nw_configured", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
