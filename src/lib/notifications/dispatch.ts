/**
 * Fan a triggered price alert out to every enabled delivery channel. Channels
 * live in `notification_channels`; each is best-effort and independent, so one
 * failing never blocks the others.
 */
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notificationChannels } from "@/db/schema";
import { sendPush } from "./webpush";
import { sendAlertEmail } from "./email";

export interface AlertNotice {
  symbol: string;
  direction: string; // above | below
  targetPrice: number;
  price: number;
  currency: string;
}

export function formatAlert(a: AlertNotice): { title: string; body: string } {
  const sym = a.symbol.replace(/^BVB:/, "");
  const op = a.direction === "above" ? "≥" : "≤";
  return {
    title: `${sym} ${op} ${a.targetPrice} ${a.currency}`,
    body: `${sym} is now ${a.price} ${a.currency} (target ${op} ${a.targetPrice} ${a.currency}).`,
  };
}

export async function dispatchAlerts(notices: AlertNotice[]): Promise<void> {
  if (notices.length === 0) return;
  const channels = await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.enabled, true), isNull(notificationChannels.deletedAt)));
  if (channels.length === 0) return;

  const push = channels.find((c) => c.type === "webpush");
  const email = channels.find((c) => c.type === "email");

  // Web Push: one notification per alert so each is individually actionable.
  if (push) {
    for (const n of notices) {
      const { title, body } = formatAlert(n);
      await sendPush({ title, body, url: "/dashboard/watchlist" });
    }
  }

  // Email: a single digest (one alert → its title; several → a summary).
  const address = email?.config?.address;
  if (email && address) {
    const subject =
      notices.length === 1
        ? formatAlert(notices[0]).title
        : `${notices.length} price alerts triggered`;
    await sendAlertEmail(address, subject, notices.map((n) => formatAlert(n).body));
  }
}
