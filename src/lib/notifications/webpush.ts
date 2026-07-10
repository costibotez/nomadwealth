/**
 * Web Push delivery. Sends an encrypted payload to every stored subscription
 * using the install's own VAPID keys. Expired subscriptions (404/410) are
 * pruned so the table self-heals.
 */
import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getOrCreateVapid } from "./vapid";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPush(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  const vapid = await getOrCreateVapid();
  if (!vapid) return { sent: 0, removed: 0 };
  webpush.setVapidDetails("mailto:notifications@nomadwealth.app", vapid.publicKey, vapid.privateKey);

  const subs = await db.select().from(pushSubscriptions);
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
          removed++;
        }
        // Other errors (network, 5xx) are swallowed — best-effort delivery.
      }
    }),
  );
  return { sent, removed };
}
