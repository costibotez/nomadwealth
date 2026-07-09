import { NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  timingSafeEqual,
} from "@/lib/auth";
import { getOwner, verifyPassword } from "@/lib/owner";

export const runtime = "nodejs";

const schema = z.object({ password: z.string().min(1).max(512) });

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

  const token = await signSession(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
