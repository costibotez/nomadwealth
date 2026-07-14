import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-actions";
import { bumpSessionVersion } from "@/lib/owner";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Owner-only: revoke every outstanding session on every device by bumping the
 * owner's session generation, then clear this device's cookie too. The owner
 * signs back in with their password (and 2FA if enabled).
 */
export async function POST() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await bumpSessionVersion();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
