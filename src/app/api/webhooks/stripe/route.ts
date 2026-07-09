import { NextResponse } from "next/server";
import { signLicenseKey, canSignLicenses } from "@/lib/license-sign";
import {
  verifyStripeSignature,
  resolveTier,
  oneYearFromNowISO,
  sendLicenseEmail,
} from "@/lib/stripe-webhook";

export const runtime = "nodejs";
// Raw body is required for signature verification — never parse before verifying.
export const dynamic = "force-dynamic";

/**
 * Stripe webhook: on a completed checkout, sign a license key from the purchased
 * tier and email it to the customer. VENDOR-ONLY — inert unless
 * STRIPE_WEBHOOK_SECRET + NW_LICENSE_PRIVATE_KEY are configured (buyer self-host
 * installs never set these). No financial data is stored; only an opaque key is
 * produced and emailed.
 *
 * Configure in Stripe → Developers → Webhooks → endpoint
 *   https://<vendor-domain>/api/webhooks/stripe   event: checkout.session.completed
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !canSignLicenses()) {
    // Not the vendor deployment — nothing to do.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const rawBody = await req.text();
  const ok = await verifyStripeSignature(
    rawBody,
    req.headers.get("stripe-signature"),
    secret,
  );
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    type: string;
    data: { object: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only act on a completed checkout (covers both one-time and the first
  // payment of a subscription). Everything else is acknowledged and ignored.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as {
    customer_details?: { email?: string };
    customer_email?: string;
    amount_total?: number | null;
    metadata?: Record<string, string>;
  };

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) {
    // Can't deliver a key without an address — 200 so Stripe doesn't retry.
    console.error("[stripe-webhook] checkout completed without an email");
    return NextResponse.json({ received: true, warning: "no email" });
  }

  const { tier, productLabel } = resolveTier(
    session.metadata?.tier,
    session.amount_total ?? null,
  );
  const updatesUntil = oneYearFromNowISO();

  const key = await signLicenseKey({ tier, sub: email, updatesUntil });
  const emailed = await sendLicenseEmail({ to: email, key, productLabel, updatesUntil });

  if (!emailed) {
    // Email not configured or failed — log the key so the vendor can send it by
    // hand. (This appears only in the vendor's own server logs.)
    console.warn(
      `[stripe-webhook] license for ${email} (${productLabel}) not emailed; key=${key}`,
    );
  }

  return NextResponse.json({ received: true, emailed });
}
