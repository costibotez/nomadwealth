/**
 * Server-side alert evaluation + out-of-app delivery (the Phase-0 enabler).
 *
 * Two decoupled steps so delivery is reliable regardless of how an alert fired:
 *  1. Trigger: any active, untriggered alert whose fresh price crosses target
 *     gets `triggered_at` / `triggered_price` set (same rule as the in-app
 *     checkAlerts server action).
 *  2. Deliver: any alert that is triggered but not yet notified (`notified_at IS
 *     NULL`) is fanned out to the enabled channels and stamped. This catches
 *     alerts triggered by the in-app path (tab open) too, and guarantees exactly
 *     one out-of-app notification per trigger.
 */
import "server-only";
import { and, eq, isNull, isNotNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { priceAlerts } from "@/db/schema";
import { dispatchAlerts, type AlertNotice } from "./dispatch";

export async function evaluateAndNotify(
  quotes: { symbol: string; assetClass: string; price: number }[],
): Promise<{ triggered: number; notified: number }> {
  const priceByKey = new Map(quotes.map((q) => [`${q.assetClass}:${q.symbol}`, q.price]));

  // ── 1. Trigger newly-hit alerts ────────────────────────────────────────
  const active = await db
    .select()
    .from(priceAlerts)
    .where(and(isNull(priceAlerts.deletedAt), eq(priceAlerts.active, true), isNull(priceAlerts.triggeredAt)));

  let triggered = 0;
  for (const a of active) {
    const price = priceByKey.get(`${a.assetClass}:${a.symbol}`);
    if (price == null || !Number.isFinite(price)) continue;
    const target = Number(a.targetPrice);
    const hit = a.direction === "above" ? price >= target : price <= target;
    if (!hit) continue;
    await db
      .update(priceAlerts)
      .set({ triggeredAt: new Date(), triggeredPrice: String(price), updatedAt: new Date() })
      .where(eq(priceAlerts.id, a.id));
    triggered++;
  }

  // ── 2. Deliver anything triggered-but-unnotified ───────────────────────
  const pending = await db
    .select()
    .from(priceAlerts)
    .where(
      and(
        isNull(priceAlerts.deletedAt),
        eq(priceAlerts.active, true),
        isNotNull(priceAlerts.triggeredAt),
        isNull(priceAlerts.notifiedAt),
      ),
    );

  if (pending.length === 0) return { triggered, notified: 0 };

  const notices: AlertNotice[] = pending.map((a) => ({
    symbol: a.symbol,
    direction: a.direction,
    targetPrice: Number(a.targetPrice),
    price: Number(a.triggeredPrice ?? a.targetPrice),
    currency: a.currency,
  }));
  await dispatchAlerts(notices);
  await db
    .update(priceAlerts)
    .set({ notifiedAt: new Date(), updatedAt: new Date() })
    .where(inArray(priceAlerts.id, pending.map((a) => a.id)));

  return { triggered, notified: pending.length };
}
