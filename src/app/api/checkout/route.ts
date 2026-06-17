import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { PRICING, SITE } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseCourseAccess } from "@/lib/access";

export const runtime = "nodejs";

const TierSchema = z.enum(["core", "premium"]);

// POST /api/checkout
//   tier=core | premium
//   upgrade=1   (optional; only honored when the logged-in user has tier=core
//                and is purchasing premium — applies the $50-off coupon)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const parsedTier = TierSchema.safeParse(formData.get("tier"));
  if (!parsedTier.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tier = parsedTier.data;
  const product = tier === "core" ? PRICING.core : PRICING.premium;
  const upgradeRequested = formData.get("upgrade") === "1";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side gate for the upgrade discount: only apply the coupon when the
  // user is logged in, has tier=core today, and is buying Premium. Anyone else
  // requesting upgrade=1 just gets the regular Premium checkout.
  let applyUpgradeCoupon = false;
  if (upgradeRequested && tier === "premium" && user) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("course_access")
      .eq("user_id", user.id)
      .maybeSingle();
    const access = parseCourseAccess(profile?.course_access);
    applyUpgradeCoupon = access.tier === "core";
  }

  const couponId = process.env.STRIPE_COUPON_CORE_UPGRADE;
  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined =
    applyUpgradeCoupon && couponId ? [{ coupon: couponId }] : undefined;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    success_url: `${SITE.url}/enroll-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE.url}/?canceled=1`,
    customer_email: user?.email ?? undefined,
    client_reference_id: user?.id,
    metadata: {
      tier,
      ...(applyUpgradeCoupon ? { upgrade_from_core: "1" } : {}),
    },
  };

  if (discounts) {
    // discounts and allow_promotion_codes are mutually exclusive on Stripe.
    sessionParams.discounts = discounts;
  } else {
    sessionParams.allow_promotion_codes = true;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
