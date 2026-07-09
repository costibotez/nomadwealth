import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appConfig, license } from "@/db/schema";
import { requireSession } from "@/lib/auth-actions";
import { pingActivation } from "@/lib/activation-ping";

export const runtime = "nodejs";

const schema = z.object({ enabled: z.boolean() });

/** Owner toggle for the opt-in activation ping (default OFF). */
export async function POST(req: Request) {
  await requireSession();
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const { enabled } = parsed.data;

  await db
    .update(appConfig)
    .set({ shareActivation: enabled, updatedAt: sql`now()` })
    .where(eq(appConfig.id, 1));

  // If just enabled, share the current activation once so it registers now.
  if (enabled) {
    const rows = await db.select().from(license).limit(1);
    const row = rows[0];
    if (row) {
      await pingActivation(
        row.key,
        row.tier,
        row.updatesUntil ? new Date(row.updatesUntil).toISOString() : null,
      );
    }
  }

  return NextResponse.json({ ok: true, enabled });
}
