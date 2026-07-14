/**
 * Weekly net-worth digest — the proactive pull-back-in loop for a self-hosted
 * app nobody logs into daily. Opt-in via the "digest" notification channel
 * (Settings → Notifications); delivered through the owner's existing channels:
 * Web Push (install's own VAPID keys) and email (owner's own Resend key).
 * Nothing ever touches vendor infrastructure — see CLAUDE.md.
 */
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notificationChannels } from "@/db/schema";
import { getNetWorthModel } from "@/lib/aggregate";
import { getNetWorthHistory } from "@/db/queries";
import { getOwner } from "@/lib/owner";
import { sendNotificationEmail } from "./email";
import { sendPush } from "./webpush";

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export async function sendWeeklyDigest(): Promise<{ sent: boolean; reason?: string }> {
  const [digest] = await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.type, "digest"), isNull(notificationChannels.deletedAt)))
    .limit(1);
  if (!digest?.enabled) return { sent: false, reason: "digest not enabled" };

  const [m, history] = await Promise.all([getNetWorthModel(), getNetWorthHistory()]);
  const total = m.totalNetWorthEur;

  // Compare against the snapshot closest to 7 days ago (snapshots are daily,
  // but tolerate gaps from paused crons).
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let prev: number | null = null;
  let prevDist = Infinity;
  for (const h of history) {
    const dist = Math.abs(new Date(h.snapshotDate).getTime() - weekAgo);
    if (dist < prevDist) {
      prevDist = dist;
      prev = h.totalEur;
    }
  }
  const delta = prev != null ? total - prev : null;

  const lines = [
    `Net worth: ${eur(total)}${
      delta != null
        ? ` (${delta >= 0 ? "+" : "−"}${eur(Math.abs(delta))} vs last week)`
        : ""
    }`,
    `Holdings ${eur(m.totalCurrentValueEur)} · Real estate ${eur(m.components.propertiesEur)} · Cash ${eur(m.components.accountsEur)} · Loans ${eur(m.components.loansEur)} · Businesses ${eur(m.components.businessesEur)}`,
    `Unrealized P/L: ${m.unrealizedPlEur >= 0 ? "+" : "−"}${eur(Math.abs(m.unrealizedPlEur))}`,
  ];
  const title =
    delta != null
      ? `Weekly digest — ${eur(total)} (${delta >= 0 ? "up" : "down"} ${eur(Math.abs(delta))})`
      : `Weekly digest — ${eur(total)}`;

  await sendPush({ title, body: lines[1], url: "/dashboard" });

  // Email address preference: digest config → email channel config → owner.
  const [emailChannel] = await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.type, "email"), isNull(notificationChannels.deletedAt)))
    .limit(1);
  const owner = await getOwner().catch(() => null);
  const address =
    digest.config?.address ?? emailChannel?.config?.address ?? owner?.email ?? null;
  if (address) {
    await sendNotificationEmail({
      to: address,
      subject: title,
      heading: "Your weekly net-worth digest",
      lines,
      cta: { label: "Open your cockpit", url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app"}/dashboard` },
    });
  }
  return { sent: true };
}
