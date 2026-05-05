import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { PRICING, SITE } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const TierSchema = z.enum(["core", "premium"]);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const parsed = TierSchema.safeParse(formData.get("tier"));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tier = parsed.data;
  const product = tier === "core" ? PRICING.core : PRICING.premium;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${SITE.url}/enroll-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE.url}/?canceled=1`,
    customer_email: user?.email,
    client_reference_id: user?.id,
    metadata: { tier },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
