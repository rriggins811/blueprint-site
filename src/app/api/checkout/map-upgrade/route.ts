import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRICING, SITE } from "@/lib/site";

export const runtime = "nodejs";

// GET /api/checkout/map-upgrade
//
// The ascension offer: a $9.99 Blueprint Map buyer upgrades to the full $47
// Blueprint Core for a discounted $30. Uses a dedicated $30 price on the SAME
// Core product, so the stripe webhook's tier=core branch grants identical Core
// course access (the only difference is the amount paid). Linked from the map's
// locked-tool CTA. A GET so it can be a plain link.
export async function GET(_req: NextRequest) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: PRICING.mapUpgrade.stripePriceId, quantity: 1 }],
    success_url: `${SITE.url}/enroll-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE.rssSite}/blueprint-preview`,
    allow_promotion_codes: true,
    // tier=core routes this to the Core grant in the webhook; the from-map flag
    // is just for funnel analytics.
    metadata: { tier: "core", upgrade_from_map: "1" },
    payment_intent_data: { metadata: { tier: "core" } },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
