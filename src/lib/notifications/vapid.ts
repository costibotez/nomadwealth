/**
 * Web Push VAPID keypair, generated once and stored on the singleton app_config
 * row. Keyless by design — the buyer's install mints its own keys; nothing is
 * shared with the vendor (see CLAUDE.md). The public key is handed to the
 * browser at subscribe time; the private key signs push requests server-side.
 */
import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appConfig } from "@/db/schema";

export async function getOrCreateVapid(): Promise<{ publicKey: string; privateKey: string } | null> {
  const rows = await db.select().from(appConfig).limit(1);
  const cfg = rows[0];
  if (!cfg) return null; // unconfigured install — nothing to attach keys to
  if (cfg.vapidPublicKey && cfg.vapidPrivateKey) {
    return { publicKey: cfg.vapidPublicKey, privateKey: cfg.vapidPrivateKey };
  }
  const keys = webpush.generateVAPIDKeys();
  await db
    .update(appConfig)
    .set({ vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey, updatedAt: new Date() })
    .where(eq(appConfig.id, cfg.id));
  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}

export async function getVapidPublicKey(): Promise<string | null> {
  return (await getOrCreateVapid())?.publicKey ?? null;
}
