/**
 * Weekly net-worth digest cron (Vercel Cron, Mondays 07:00 — see vercel.json).
 * Secured by CRON_SECRET exactly like the other cron routes. Opt-in: no-ops
 * unless the "digest" notification channel is enabled in Settings.
 */
import { NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/lib/notifications/digest";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false; // fail closed if unset
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendWeeklyDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("weekly digest failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
