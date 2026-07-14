import { NextResponse } from "next/server";
import { z } from "zod";
import {
  bumpSessionVersion,
  getOwner,
  setOwnerPassword,
  verifyPassword,
} from "@/lib/owner";
import { requireSession } from "@/lib/auth-actions";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  timingSafeEqual,
} from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1).max(512),
  newPassword: z.string().min(8, "Use at least 8 characters").max(512),
});

/**
 * Owner-only: rotate the account password after setup. Re-confirms identity with
 * the current password (defense in depth over the required session — a change
 * from a left-open session should still need the current secret). Confirms
 * against the owner hash if a row exists, else against the env DASHBOARD_PASSWORD
 * fallback. Setting a password while on that fallback creates the owner row,
 * which makes the env password inert and unlocks app-managed 2FA.
 */
export async function POST(req: Request) {
  await requireSession();

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const row = await getOwner().catch(() => null);
  let confirmed: boolean;
  if (row) {
    confirmed = await verifyPassword(currentPassword, row.passwordHash);
  } else {
    const envPassword = process.env.DASHBOARD_PASSWORD;
    confirmed =
      Boolean(envPassword) && timingSafeEqual(currentPassword, envPassword as string);
  }
  if (!confirmed) {
    return NextResponse.json(
      { ok: false, error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  const { created } = await setOwnerPassword(newPassword);

  // Revoke every outstanding session token; keep THIS device signed in by
  // issuing a fresh cookie carrying the new generation.
  const ver = await bumpSessionVersion();
  const res = NextResponse.json({ ok: true, ownerCreated: created });
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    res.cookies.set(SESSION_COOKIE, await signSession(secret, ver), sessionCookieOptions);
  }
  return res;
}
