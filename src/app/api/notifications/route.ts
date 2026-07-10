import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notificationChannels } from "@/db/schema";
import { requireSession } from "@/lib/auth-actions";
import { getOwner } from "@/lib/owner";
import { getVapidPublicKey } from "@/lib/notifications/vapid";
import { emailConfigured } from "@/lib/notifications/email";

export const runtime = "nodejs";

/** Owner-only: current notification settings for the Settings → Notifications UI. */
export async function GET() {
  await requireSession();
  const [rows, owner, vapidPublicKey] = await Promise.all([
    db.select().from(notificationChannels).where(isNull(notificationChannels.deletedAt)),
    getOwner().catch(() => null),
    getVapidPublicKey().catch(() => null),
  ]);
  const byType = Object.fromEntries(rows.map((r) => [r.type, r]));
  return NextResponse.json({
    ok: true,
    vapidPublicKey,
    emailConfigured: emailConfigured(),
    ownerEmail: owner?.email ?? null,
    webpush: { enabled: Boolean(byType.webpush?.enabled) },
    email: {
      enabled: Boolean(byType.email?.enabled),
      address: byType.email?.config?.address ?? owner?.email ?? "",
    },
  });
}

const patchSchema = z.object({
  type: z.enum(["webpush", "email"]),
  enabled: z.boolean().optional(),
  address: z.string().email().optional(),
});

/** Owner-only: enable/disable a channel or set the email address. */
export async function POST(req: Request) {
  await requireSession();
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const { type, enabled, address } = parsed.data;

  // Enabling email requires a delivery address.
  const existing = (
    await db.select().from(notificationChannels).where(eq(notificationChannels.type, type)).limit(1)
  )[0];
  const nextAddress = address ?? existing?.config?.address;
  if (type === "email" && enabled && !nextAddress) {
    return NextResponse.json({ ok: false, error: "Add an email address first." }, { status: 400 });
  }

  const config = type === "email" && nextAddress ? { address: nextAddress } : existing?.config ?? null;
  if (existing) {
    await db
      .update(notificationChannels)
      .set({
        enabled: enabled ?? existing.enabled,
        config,
        updatedAt: new Date(),
      })
      .where(eq(notificationChannels.id, existing.id));
  } else {
    await db.insert(notificationChannels).values({ type, enabled: enabled ?? false, config });
  }
  return NextResponse.json({ ok: true });
}
