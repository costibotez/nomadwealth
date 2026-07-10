import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { owner as ownerTable } from "@/db/schema";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  timingSafeEqual,
} from "@/lib/auth";
import { getOwner, verifyPassword } from "@/lib/owner";
import { verifySecondFactor } from "@/lib/two-factor";

export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(1).max(512),
  code: z.string().max(16).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Auth precedence: the owner row (set in the setup wizard) is authoritative.
  // Fall back to the env DASHBOARD_PASSWORD only when no owner exists, so the
  // original CLI/advanced install path keeps working.
  let ok = false;
  const owner = await getOwner().catch(() => null);
  if (owner) {
    ok = await verifyPassword(parsed.data.password, owner.passwordHash);
  } else {
    const envPassword = process.env.DASHBOARD_PASSWORD;
    ok =
      Boolean(envPassword) &&
      timingSafeEqual(parsed.data.password, envPassword as string);
  }

  if (!ok) {
    // Generic message; do not reveal whether the password was close.
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Second factor (only when the owner has enabled TOTP). The env-password
  // fallback path has no owner row, so it is unaffected.
  if (owner && owner.totpEnabled) {
    const code = parsed.data.code?.trim();
    if (!code) {
      // Password is correct; ask the client to reveal the code field. No
      // session is issued yet.
      return NextResponse.json({ twoFactorRequired: true }, { status: 200 });
    }
    const factor = await verifySecondFactor(owner, code);
    if (!factor.ok) {
      // Generic message — do not reveal password vs. code specifics.
      return NextResponse.json(
        { error: "Incorrect code", twoFactorRequired: true },
        { status: 401 },
      );
    }
    // If a single-use backup code was consumed, persist the shortened list.
    if (factor.consumedBackupCodes) {
      await db
        .update(ownerTable)
        .set({ backupCodes: factor.consumedBackupCodes })
        .where(eq(ownerTable.id, owner.id));
    }
  }

  const token = await signSession(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
