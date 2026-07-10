import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { owner } from "@/db/schema";
import { getOwner } from "@/lib/owner";
import { requireSession } from "@/lib/auth-actions";
import { verifyTOTP } from "@/lib/totp";
import { generateBackupCodes, hashBackupCodes } from "@/lib/two-factor";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().min(1).max(16) });

/**
 * Owner-only: confirm the pending TOTP secret with a live 6-digit code, turn 2FA
 * ON, and return freshly generated backup codes ONCE (only their hashes are
 * stored). Idempotency: requires an in-progress secret from /api/2fa/setup.
 */
export async function POST(req: Request) {
  await requireSession();

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Code required" }, { status: 400 });
  }

  const row = await getOwner().catch(() => null);
  if (!row || !row.totpSecret) {
    return NextResponse.json(
      { ok: false, error: "Start setup first." },
      { status: 409 },
    );
  }
  if (row.totpEnabled) {
    // Already on — don't let a replayed enable silently rotate the backup codes.
    return NextResponse.json(
      { ok: false, error: "Two-factor is already enabled." },
      { status: 409 },
    );
  }

  const valid = await verifyTOTP(row.totpSecret, parsed.data.code);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "That code didn't match. Check your authenticator and try again." },
      { status: 400 },
    );
  }

  const backupCodes = generateBackupCodes();
  const hashed = await hashBackupCodes(backupCodes);

  await db
    .update(owner)
    .set({ totpEnabled: true, backupCodes: hashed })
    .where(eq(owner.id, row.id));

  // Plaintext codes are returned exactly once — never stored, never logged.
  return NextResponse.json({ ok: true, backupCodes });
}
