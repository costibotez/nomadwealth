import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { owner } from "@/db/schema";
import { getOwner } from "@/lib/owner";
import { requireSession } from "@/lib/auth-actions";
import { generateSecret, otpauthURL } from "@/lib/totp";

export const runtime = "nodejs";

/**
 * Owner-only: begin TOTP enrollment. Generates a fresh secret, stores it on the
 * owner row (still DISABLED — login is unaffected until /api/2fa/enable confirms
 * a code), and returns the otpauth URL + a QR data-URL for the authenticator.
 * The QR is rendered locally (no external service) — nothing leaves the install.
 */
export async function POST() {
  await requireSession();

  const row = await getOwner().catch(() => null);
  if (!row) {
    // Env-password installs have no owner row; 2FA requires an owner account.
    return NextResponse.json(
      { ok: false, error: "No owner account. Set an owner password first." },
      { status: 409 },
    );
  }
  if (row.totpEnabled) {
    return NextResponse.json(
      { ok: false, error: "Two-factor is already enabled. Disable it first to re-enroll." },
      { status: 409 },
    );
  }

  const secret = generateSecret();
  const account = row.email || "owner";
  const url = otpauthURL(secret, account);
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240 });

  // Persist the pending (still-disabled) secret so /enable can verify against it.
  await db.update(owner).set({ totpSecret: secret }).where(eq(owner.id, row.id));

  return NextResponse.json({ ok: true, secret, otpauthUrl: url, qrDataUrl });
}
