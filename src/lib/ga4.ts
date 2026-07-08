// GA4 Measurement Protocol purchase events, fired server-side from the
// Stripe webhook so revenue shows up in GA4 (which client-side gtag never
// sees for checkout completed off-site). Fire-and-forget: a GA4 failure
// must never fail fulfillment.
//
// Env: GA4_MEASUREMENT_ID (G-XXXX, same stream as the rss-site tag) and
// GA4_API_SECRET (Measurement Protocol secret created Jul 8, 2026).

import { createHash } from "node:crypto";

export async function sendGa4Purchase(args: {
  transactionId: string;
  valueUsd: number;
  itemName: string; // e.g. "blueprint_core" | "blueprint_premium" | "blueprint_map"
  /** Stable pseudonymous id; we derive one from the email so repeat buyers dedupe. */
  email?: string | null;
}): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  // MP requires a client_id. We have no browser context in a webhook, so use
  // a stable hash of the email (pseudonymous, consistent across purchases).
  const seed = args.email?.toLowerCase().trim() || args.transactionId;
  const hash = createHash("sha256").update(seed).digest("hex");
  const clientId = `${parseInt(hash.slice(0, 8), 16)}.${parseInt(hash.slice(8, 16), 16)}`;

  const body = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: args.transactionId,
          value: args.valueUsd,
          currency: "USD",
          items: [{ item_name: args.itemName, price: args.valueUsd, quantity: 1 }],
        },
      },
    ],
  };

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      }
    );
  } catch {
    // Swallow: analytics must never break fulfillment.
  }
}
