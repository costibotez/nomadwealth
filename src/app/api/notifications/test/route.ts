import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationChannels } from "@/db/schema";
import { requireSession } from "@/lib/auth-actions";
import { sendPush } from "@/lib/notifications/webpush";
import { sendAlertEmail, emailConfigured } from "@/lib/notifications/email";
import { getOwner } from "@/lib/owner";

export const runtime = "nodejs";

const schema = z.object({ type: z.enum(["webpush", "email"]) });

/** Owner-only: send a sample notification through one channel to prove delivery. */
export async function POST(req: Request) {
  await requireSession();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (parsed.data.type === "webpush") {
    const { sent } = await sendPush({
      title: "NomadWealth test alert",
      body: "Web Push is working — you'll get price alerts here.",
      url: "/dashboard/watchlist",
    });
    if (sent === 0) {
      return NextResponse.json(
        { ok: false, error: "No active browser subscriptions. Enable notifications first." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, sent });
  }

  // email
  if (!emailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Email isn't configured. Set RESEND_API_KEY and a from-address." },
      { status: 400 },
    );
  }
  const [row, owner] = await Promise.all([
    db.select().from(notificationChannels).where(eq(notificationChannels.type, "email")).limit(1),
    getOwner().catch(() => null),
  ]);
  const address = row[0]?.config?.address ?? owner?.email ?? undefined;
  if (!address) {
    return NextResponse.json({ ok: false, error: "Add an email address first." }, { status: 400 });
  }
  const ok = await sendAlertEmail(address, "NomadWealth test alert", [
    "This is a test — your price-alert emails are working.",
  ]);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: "Resend rejected the email. Check your key/from-address." }, { status: 502 });
}
