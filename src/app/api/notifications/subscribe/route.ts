import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/auth-actions";

export const runtime = "nodejs";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Owner-only: store (or refresh) a Web Push subscription for this browser. */
export async function POST(req: Request) {
  await requireSession();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys } = parsed.data;

  // Upsert on the unique endpoint — re-subscribing the same browser refreshes
  // its keys rather than duplicating.
  await db
    .insert(pushSubscriptions)
    .values({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: keys.p256dh, auth: keys.auth },
    });
  return NextResponse.json({ ok: true });
}

const delSchema = z.object({ endpoint: z.string().url() });

/** Owner-only: drop this browser's subscription (called on unsubscribe). */
export async function DELETE(req: Request) {
  await requireSession();
  const parsed = delSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, parsed.data.endpoint));
  return NextResponse.json({ ok: true });
}
