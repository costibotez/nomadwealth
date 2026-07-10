import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { owner } from "@/db/schema";
import { getOwner, verifyPassword } from "@/lib/owner";
import { requireSession } from "@/lib/auth-actions";
import { verifySecondFactor } from "@/lib/two-factor";

export const runtime = "nodejs";

// A single confirmation secret: a current TOTP/backup code OR the account
// password. Sized for the longest of those (owner passwords go up to 512).
const schema = z.object({ secret: z.string().min(1).max(512) });

/**
 * Owner-only: turn 2FA OFF. Re-confirms identity with a current TOTP/backup code
 * OR the account password (defense in depth even though the session is already
 * required). Clears the secret + backup codes so a later re-enroll starts clean.
 */
export async function POST(req: Request) {
  await requireSession();

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const { secret } = parsed.data;

  const row = await getOwner().catch(() => null);
  if (!row || !row.totpEnabled) {
    return NextResponse.json(
      { ok: false, error: "Two-factor is not enabled." },
      { status: 409 },
    );
  }

  // Try the value as a second factor (TOTP/backup, trimmed internally), then as
  // the exact account password.
  let confirmed = (await verifySecondFactor(row, secret)).ok;
  if (!confirmed) {
    confirmed = await verifyPassword(secret, row.passwordHash);
  }
  if (!confirmed) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid code or your password to disable." },
      { status: 400 },
    );
  }

  await db
    .update(owner)
    .set({ totpSecret: null, totpEnabled: false, backupCodes: null })
    .where(eq(owner.id, row.id));

  return NextResponse.json({ ok: true });
}
