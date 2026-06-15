import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { PRICING, SITE } from "@/lib/site";

export const runtime = "nodejs";

// GET /api/checkout/map
//
// Cold-traffic checkout for the $9.99 Blueprint Map tripwire. Unlike
// /api/checkout (core/premium, which is for logged-in Blueprint users), the
// map buyer arrives from a cold ad with no account, so there is no login,
// no upgrade-coupon logic, and no user lookup. Stripe Checkout collects the
// email; the stripe webhook (tier=map branch) issues the access token and
// emails the buyer their private map link. A GET so the sales-page button can
// be a plain link.
export async function GET(_req: NextRequest) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: PRICING.map.stripePriceId, quantity: 1 }],
    // Straight into the map: it polls for the webhook-issued access by
    // session_id and unlocks in place (instant access). The emailed token link
    // is the backstop for returning later / closed tabs.
    success_url: `${SITE.rssSite}/blueprint-map?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE.rssSite}/blueprint-preview?canceled=1`,
    allow_promotion_codes: true,
    // tier=map is read by the webhook to route this to blueprint_access
    // (a separate store from course_access) instead of the core/premium path.
    metadata: { tier: "map" },
    payment_intent_data: { metadata: { tier: "map" } },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
