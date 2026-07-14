/**
 * Net-worth milestone celebrations ("you crossed €100k"). Piggybacks on the
 * daily check-alerts cron: computes the current total, and if it passed a new
 * threshold since the last recorded one, notifies via the enabled channels.
 * The highest celebrated milestone is stored in app_config so each threshold
 * fires exactly once; the first run records silently (no retroactive fanfare).
 */
import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appConfig, notificationChannels } from "@/db/schema";
import { getNetWorthModel } from "@/lib/aggregate";
import { getOwner } from "@/lib/owner";
import { sendNotificationEmail } from "./email";
import { sendPush } from "./webpush";

/** Milestone granularity grows with net worth so it stays meaningful. */
function milestoneFor(totalEur: number): number {
  const step = totalEur < 100_000 ? 10_000 : totalEur < 1_000_000 ? 50_000 : 250_000;
  return Math.floor(totalEur / step) * step;
}

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export async function checkMilestones(): Promise<{ celebrated: number | null }> {
  const [cfg] = await db.select().from(appConfig).limit(1);
  if (!cfg) return { celebrated: null }; // unconfigured install

  const m = await getNetWorthModel();
  const current = milestoneFor(m.totalNetWorthEur);
  const last = cfg.lastMilestoneEur == null ? null : Number(cfg.lastMilestoneEur);

  // First run: record where we are without celebrating history.
  // Also track downward moves so a later re-cross celebrates again honestly.
  if (last === null || current < last) {
    await db
      .update(appConfig)
      .set({ lastMilestoneEur: String(current), updatedAt: sql`now()` })
      .where(eq(appConfig.id, cfg.id));
    return { celebrated: null };
  }
  if (current <= last || current <= 0) return { celebrated: null };

  const title = `Milestone: your net worth crossed ${eur(current)} 🎉`;
  const body = `Total net worth is now ${eur(m.totalNetWorthEur)}. Keep going.`;

  await sendPush({ title, body, url: "/dashboard" });

  const [emailChannel] = await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.type, "email"), isNull(notificationChannels.deletedAt)))
    .limit(1);
  const owner = await getOwner().catch(() => null);
  const address = emailChannel?.enabled
    ? emailChannel.config?.address ?? owner?.email ?? null
    : null;
  if (address) {
    await sendNotificationEmail({
      to: address,
      subject: title,
      heading: "New net-worth milestone",
      lines: [body],
      cta: {
        label: "Open your cockpit",
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app"}/dashboard`,
      },
    });
  }

  await db
    .update(appConfig)
    .set({ lastMilestoneEur: String(current), updatedAt: sql`now()` })
    .where(eq(appConfig.id, cfg.id));
  return { celebrated: current };
}
