import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { PRICING } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import {
  sendCoreWelcomeEmail,
  sendPremiumWelcomeEmail,
} from "@/lib/email/resend";
import {
  parseCourseAccess,
  coreTierAccess,
  premiumTierAccess,
  type Tier,
} from "@/lib/access";
import { notifyNewPaidCustomer } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook handler.
// Verifies signature, processes checkout.session.completed events,
// finds-or-creates the auth user by email, sets course_access to the new
// tier shape, fires Make.com + GHL legacy webhooks, and sends the welcome.
// Idempotent: re-deliveries overwrite with the same data.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email ?? session.customer_email;
  const tier = session.metadata?.tier as Tier | undefined;

  if (!email || (tier !== "core" && tier !== "premium")) {
    return NextResponse.json(
      { error: "Session missing email or valid tier metadata" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  // Find-or-create auth user.
  let userId = session.client_reference_id ?? null;
  if (!userId) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
        });
      if (createErr || !created?.user) {
        return NextResponse.json(
          { error: createErr?.message ?? "Failed to create user" },
          { status: 500 }
        );
      }
      userId = created.user.id;
    }
  }

  // Find-or-create user_profile and capture prior tier for funnel analytics.
  const { data: profile } = await admin
    .from("user_profile")
    .select("id, course_access, first_name")
    .eq("user_id", userId)
    .maybeSingle();
  const prior = profile ? parseCourseAccess(profile.course_access) : null;
  const upgradedFrom: Tier | undefined = prior?.tier;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const stripePaymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const newAccess =
    tier === "premium"
      ? premiumTierAccess({
          stripe_customer_id: stripeCustomerId,
          stripe_session_id: session.id,
          stripe_payment_id: stripePaymentId,
          upgraded_from: upgradedFrom,
        })
      : coreTierAccess({
          stripe_customer_id: stripeCustomerId,
          stripe_session_id: session.id,
          stripe_payment_id: stripePaymentId,
          upgraded_from: upgradedFrom,
        });

  if (profile) {
    const { error: updErr } = await admin
      .from("user_profile")
      .update({
        course_access: newAccess,
        stripe_customer_id: stripeCustomerId ?? null,
      })
      .eq("id", profile.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await admin.from("user_profile").insert({
      user_id: userId,
      course_access: newAccess,
      stripe_customer_id: stripeCustomerId ?? null,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // Send tier-appropriate welcome via Resend (silent skip if no API key).
  const customerName = session.customer_details?.name ?? null;
  const firstName = customerName?.split(" ")[0] ?? null;
  const lastName =
    customerName && customerName.split(" ").length > 1
      ? customerName.split(" ").slice(1).join(" ")
      : undefined;
  const emailResult =
    tier === "premium"
      ? await sendPremiumWelcomeEmail({ to: email, firstName })
      : await sendCoreWelcomeEmail({ to: email, firstName });

  // Best-effort magic-link so the buyer can log into the dashboard.
  await admin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  // Notify Make.com + GHL legacy. Fire-and-forget.
  notifyNewPaidCustomer({
    email,
    firstName: firstName ?? undefined,
    lastName,
    tier,
    amount_usd:
      tier === "core" ? PRICING.core.priceUsd : PRICING.premium.priceUsd,
    stripe_session_id: session.id,
    stripe_customer_id: stripeCustomerId ?? undefined,
    user_id: userId,
    upgraded_from: upgradedFrom,
  });

  return NextResponse.json({
    received: true,
    user_id: userId,
    tier,
    upgraded_from: upgradedFrom,
    welcome_email: emailResult,
  });
}
