import { NextResponse, after, type NextRequest } from "next/server";
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
import { notifyNewPaidCustomer, notifyChurn } from "@/lib/webhooks";
import { startSeniorsafeTrialIfEligible } from "@/lib/onboard-free-user";

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

  // Subscription cancellation — fan out to the Kit churn Make scenario.
  // This event fires for the SeniorSafe subscriptions ($14.99/mo,
  // $39.99/mo) hosted on the same Stripe account. Blueprint Core/Premium
  // are one-time purchases so they never produce this event. The Stripe
  // event's customer object carries only the customer ID; resolve the
  // email via stripe.customers.retrieve.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null;
    let email: string | null = null;
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
          email = customer.email;
          const name = customer.name ?? undefined;
          if (name) {
            const parts = name.split(" ");
            firstName = parts[0];
            lastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
          }
        }
      } catch (err) {
        console.warn(
          `[stripe webhook] customer.retrieve failed for ${customerId}: ${
            err instanceof Error ? err.message : "unknown"
          }`
        );
      }
    }
    if (email) {
      after(
        notifyChurn({
          email,
          firstName,
          lastName,
          prior_tier: subscription.metadata?.tier,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId ?? undefined,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : undefined,
        })
      );
    }
    return NextResponse.json({ received: true, churn_fanout: !!email });
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

  // Start the SeniorSafe trial if this user hasn't used theirs yet.
  // Gate inside the helper: only fires when subscription_tier is null/free
  // AND trial_status is null/none. Won't downgrade a paid SeniorSafe user
  // and won't reset an expired/converted trial.
  await startSeniorsafeTrialIfEligible(
    userId,
    `blueprint_${tier}_purchase`
  );

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

  // Read what the customer ACTUALLY paid (in cents → whole dollars). This
  // matters when a Core→Premium upgrade applied the $50-off coupon so the
  // amount is $247, not $297. Fall back to the list price if Stripe didn't
  // populate amount_total for some reason.
  const paidUsd =
    typeof session.amount_total === "number"
      ? Math.round(session.amount_total / 100)
      : tier === "core"
      ? PRICING.core.priceUsd
      : PRICING.premium.priceUsd;

  // Fan out to Make + GHL + Kit + Twilio. Wrapped in after() so Vercel
  // keeps the function alive through the fetch calls.
  after(
    notifyNewPaidCustomer({
      email,
      firstName: firstName ?? undefined,
      lastName,
      tier,
      amount_usd: paidUsd,
      stripe_session_id: session.id,
      stripe_customer_id: stripeCustomerId ?? undefined,
      user_id: userId,
      upgraded_from: upgradedFrom,
    })
  );

  return NextResponse.json({
    received: true,
    user_id: userId,
    tier,
    upgraded_from: upgradedFrom,
    welcome_email: emailResult,
  });
}
