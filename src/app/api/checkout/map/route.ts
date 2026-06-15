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
    // Back to the sales page with a "check your email" state; the real access
    // arrives by email (token link) so it survives a closed tab.
    success_url: `${SITE.rssSite}/blueprint-preview?purchased=1`,
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
