import { NextResponse, after, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { PRICING, SITE } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import {
  sendCoreWelcomeEmail,
  sendPremiumWelcomeEmail,
  sendMapAccessEmail,
} from "@/lib/email/resend";
import {
  parseCourseAccess,
  coreTierAccess,
  premiumTierAccess,
  freeTierAccess,
  type Tier,
} from "@/lib/access";
import {
  notifyNewPaidCustomer,
  notifyChurn,
  notifyRefund,
  notifyMapPurchase,
} from "@/lib/webhooks";
import {
  startSeniorsafeTrialIfEligible,
  applyFreeTierSetup,
} from "@/lib/onboard-free-user";
import { fireServerPurchase } from "@/lib/meta/server-fires";
import { sendGa4Purchase } from "@/lib/ga4";

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

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Only these event types have side effects here; ack + ignore everything else.
  const ACTED_EVENTS = new Set<string>([
    "customer.subscription.deleted",
    "checkout.session.completed",
    "charge.refunded",
    "charge.dispute.created",
  ]);
  if (!ACTED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  // Idempotency (#6): Stripe re-delivers events (retries / manual re-sends).
  // We CHECK here but only RECORD after the handler succeeds (markProcessed,
  // called just before each success return). This ordering matters: if we
  // recorded up front and then a handler hit a transient error, Stripe's retry
  // would be skipped as a "duplicate" and the purchase lost forever. By
  // recording only on success, a failed handler stays UNrecorded so the retry
  // reprocesses it. Under rare CONCURRENT double-delivery both pass this check:
  // the access write converges (never-downgrade + keep-purchase-date) and the
  // Meta Purchase fire dedups on a stable event id; the welcome email and the
  // Ryan SMS are at-least-once (a duplicate is low-harm, not a money/access bug).
  const { data: already } = await admin
    .from("stripe_processed_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (already) {
    return NextResponse.json({ received: true, duplicate: true });
  }
  const markProcessed = async () => {
    const { error: markErr } = await admin
      .from("stripe_processed_events")
      .upsert(
        { event_id: event.id, type: event.type },
        { onConflict: "event_id", ignoreDuplicates: true }
      );
    if (markErr) {
      console.warn(`[stripe webhook] idempotency mark error: ${markErr.message}`);
    }
  };

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
    await markProcessed();
    return NextResponse.json({ received: true, churn_fanout: !!email });
  }

  // Refund / chargeback (#5): revoke course access for a fully-refunded or
  // disputed purchase, and text Ryan. We match the profile whose CURRENT access
  // was granted by the refunded payment (course_access.stripe_payment_id), so a
  // refund of a superseded payment never strips access the buyer still earned.
  if (
    event.type === "charge.refunded" ||
    event.type === "charge.dispute.created"
  ) {
    const isChargeback = event.type === "charge.dispute.created";
    let paymentIntentId: string | null = null;
    let alertEmail: string | null = null;
    let amountUsd: number | null = null;

    if (isChargeback) {
      const dispute = event.data.object as Stripe.Dispute;
      paymentIntentId =
        typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id ?? null;
      amountUsd =
        typeof dispute.amount === "number" ? Math.round(dispute.amount / 100) : null;
    } else {
      const charge = event.data.object as Stripe.Charge;
      // Only act on FULL refunds; ignore partial refunds.
      if (!charge.refunded || (charge.amount_refunded ?? 0) < charge.amount) {
        return NextResponse.json({ received: true, partial_refund_ignored: true });
      }
      paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;
      alertEmail = charge.billing_details?.email ?? charge.receipt_email ?? null;
      amountUsd =
        typeof charge.amount_refunded === "number"
          ? Math.round(charge.amount_refunded / 100)
          : null;
    }

    let revoked = false;
    if (paymentIntentId) {
      const { data: matches } = await admin
        .from("user_profile")
        .select("id, user_id, course_access")
        .filter("course_access->>stripe_payment_id", "eq", paymentIntentId);
      if (matches && matches.length > 1) {
        console.warn(
          `[stripe webhook] payment ${paymentIntentId} matched ${matches.length} profiles`
        );
      }
      for (const match of matches ?? []) {
        if (!alertEmail) {
          const { data: userRes } = await admin.auth.admin.getUserById(
            match.user_id
          );
          alertEmail = userRes?.user?.email ?? null;
        }
        // A dispute can still be WON and there is no re-grant path, so disputes
        // are ALERT-ONLY — never revoke. Only a full refund (final, merchant-
        // initiated) revokes. And only downgrade a profile that is actually paid,
        // so a stale payment id on a free/comped row can't wipe a hand-granted comp.
        if (isChargeback) continue;
        const matchTier = parseCourseAccess(match.course_access).tier;
        if (matchTier !== "core" && matchTier !== "premium") continue;
        const { error: revErr } = await admin
          .from("user_profile")
          .update({ course_access: freeTierAccess() })
          .eq("id", match.id);
        if (revErr) {
          console.error(
            `[stripe webhook] refund downgrade failed for ${match.user_id}: ${revErr.message}`
          );
        } else {
          revoked = true;
        }
      }
    }

    after(
      notifyRefund({
        email: alertEmail,
        reason: isChargeback ? "chargeback" : "refund",
        payment_intent: paymentIntentId,
        amount_usd: amountUsd,
        revoked,
      })
    );
    await markProcessed();
    return NextResponse.json({
      received: true,
      kind: isChargeback ? "chargeback" : "refund",
      revoked,
    });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email ?? session.customer_email;
  const tier = session.metadata?.tier as Tier | undefined;

  // Blueprint Map ($9.99): its own access store (public.blueprint_access) for
  // the token-gated map, PLUS a real free-tier Blueprint ACCOUNT so the buyer
  // lands in our ecosystem (dashboard, locked modules, free guides, SeniorSafe
  // trial, nurture) instead of a dead-end token link. Handled before the
  // core/premium path. Idempotent on stripe_session_id; account onboarding is
  // idempotent (never downgrades a paid tier).
  if (session.metadata?.tier === "map") {
    if (!email) {
      return NextResponse.json(
        { error: "Map session missing email" },
        { status: 400 }
      );
    }

    // 1. Map access token (idempotent on session id).
    const { data: existingAccess } = await admin
      .from("blueprint_access")
      .select("access_token")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    let token = existingAccess?.access_token as string | undefined;
    if (!token) {
      const { data: inserted, error: insErr } = await admin
        .from("blueprint_access")
        .insert({
          email,
          tier: "map",
          stripe_session_id: session.id,
          source: "blueprint_map_purchase",
        })
        .select("access_token")
        .single();
      if (insErr || !inserted) {
        return NextResponse.json(
          { error: insErr?.message ?? "blueprint_access insert failed" },
          { status: 500 }
        );
      }
      token = inserted.access_token as string;
    }

    // 2. Find-or-create the Blueprint account so they get a login + dashboard.
    const mapName = session.customer_details?.name ?? null;
    const mapFirstName = mapName?.split(" ")[0] ?? undefined;
    const mapLastName =
      mapName && mapName.split(" ").length > 1
        ? mapName.split(" ").slice(1).join(" ")
        : undefined;
    let mapUserId = session.client_reference_id ?? null;
    if (!mapUserId) {
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
        mapUserId = existing.id;
      } else {
        const { data: created, error: createErr } =
          await admin.auth.admin.createUser({ email, email_confirm: true });
        if (createErr || !created?.user) {
          return NextResponse.json(
            { error: createErr?.message ?? "Failed to create user" },
            { status: 500 }
          );
        }
        mapUserId = created.user.id;
      }
    }

    // 3. Free-tier onboarding: course_access (Module 0 + free tools), family
    // code, SeniorSafe trial, the Free-Guide nurture, and a leads row. Never
    // downgrades a user who is already Core/Premium.
    const onboard = await applyFreeTierSetup({
      userId: mapUserId,
      email,
      firstName: mapFirstName,
      lastName: mapLastName,
      source: "blueprint_map_purchase",
    });
    after(onboard.fanout);

    // 4. Map-buyer GHL tag (branches nurture toward the $30/$47 upgrade) + Ryan SMS.
    after(notifyMapPurchase({ email, firstName: mapFirstName, lastName: mapLastName }));

    // GA4 server-side purchase (Measurement Protocol). Fire-and-forget.
    after(
      sendGa4Purchase({
        transactionId: session.id,
        valueUsd:
          typeof session.amount_total === "number"
            ? Math.round(session.amount_total) / 100
            : 9.99,
        itemName: "blueprint_map",
        email,
      })
    );

    // 5. One-click magic login for the welcome email (lands on /dashboard).
    let loginUrl: string | undefined;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const hashedToken = linkData?.properties?.hashed_token;
      if (hashedToken) {
        loginUrl =
          `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` +
          `?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=/dashboard`;
      }
    } catch {
      /* falls back to a plain /dashboard link in the email */
    }

    // 6. Welcome email: lead with the dashboard, token map link at the bottom.
    const accessUrl = `${SITE.rssSite}/blueprint-map?token=${token}`;
    const emailResult = await sendMapAccessEmail({
      to: email,
      firstName: mapFirstName,
      loginUrl,
      accessUrl,
    });
    if (!emailResult.ok) {
      // Do NOT markProcessed: a non-2xx makes Stripe retry, which re-runs this
      // (all steps above are idempotent) and re-sends the email.
      console.error(
        `[stripe webhook] map access email failed for ${email}: ${emailResult.reason}`
      );
      return NextResponse.json(
        { error: "map access email failed", reason: emailResult.reason },
        { status: 500 }
      );
    }
    await markProcessed();
    return NextResponse.json({
      received: true,
      kind: "blueprint_map",
      user_id: mapUserId,
      emailed: emailResult.id,
    });
  }

  if (!email || (tier !== "core" && tier !== "premium")) {
    return NextResponse.json(
      { error: "Session missing email or valid tier metadata" },
      { status: 400 }
    );
  }

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
  const priorTier: Tier = prior?.tier ?? "free";
  const upgradedFrom: Tier | undefined = prior?.tier;

  // Never downgrade (#6): a stale Core event re-delivered after the buyer
  // upgraded to Premium must not knock them back to Core. (free < core < premium)
  const TIER_RANK: Record<Tier, number> = { free: 0, core: 1, premium: 2 };
  if (TIER_RANK[priorTier] > TIER_RANK[tier]) {
    return NextResponse.json({
      received: true,
      skipped: "would_downgrade",
      kept_tier: priorTier,
    });
  }

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const stripePaymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // Preserve the original purchase date when the tier is unchanged so a Stripe
  // re-send never restarts the Premium 90-day support clock (#6). On a genuine
  // upgrade (core->premium) keepDate is undefined => a fresh purchase date.
  // Guard a corrupted/legacy purchased_at: an unparseable date would make
  // toISOString() throw and 500 the webhook, so fall back to a fresh date.
  const parsedPurchasedAt =
    priorTier === tier && prior?.purchased_at
      ? new Date(prior.purchased_at)
      : undefined;
  const keepDate =
    parsedPurchasedAt && !Number.isNaN(parsedPurchasedAt.getTime())
      ? parsedPurchasedAt
      : undefined;
  const effectiveUpgradedFrom =
    priorTier === tier ? prior?.upgraded_from : upgradedFrom;

  const newAccess =
    tier === "premium"
      ? premiumTierAccess({
          stripe_customer_id: stripeCustomerId,
          stripe_session_id: session.id,
          stripe_payment_id: stripePaymentId,
          upgraded_from: effectiveUpgradedFrom,
          now: keepDate,
        })
      : coreTierAccess({
          stripe_customer_id: stripeCustomerId,
          stripe_session_id: session.id,
          stripe_payment_id: stripePaymentId,
          upgraded_from: effectiveUpgradedFrom,
          now: keepDate,
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

  // Parse the buyer's name for the welcome email + downstream fan-out.
  const customerName = session.customer_details?.name ?? null;
  const firstName = customerName?.split(" ")[0] ?? null;
  const lastName =
    customerName && customerName.split(" ").length > 1
      ? customerName.split(" ").slice(1).join(" ")
      : undefined;

  // One-click login link carried INSIDE the welcome email. We mint the
  // magic-link token with the admin client and build the URL ourselves so it
  // targets our /auth/callback (token_hash + type), which verifyOtp-exchanges
  // it into a real cookie session. The previous admin.auth.signInWithOtp sent
  // a SEPARATE Supabase-templated email whose link the callback could not
  // exchange ("Missing auth code"); minting the token here lets the single
  // Resend welcome email carry a login link that actually works. generateLink
  // only MINTS the token (it sends no email) and is not subject to the email
  // OTP rate limits. Best-effort: on failure loginUrl stays undefined and the
  // email falls back to a plain /dashboard link (buyer can still get in via
  // password reset or Google sign-in).
  let loginUrl: string | undefined;
  try {
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({ type: "magiclink", email });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkErr || !hashedToken) {
      console.warn(
        `[stripe webhook] generateLink failed for ${email}: ${
          linkErr?.message ?? "no hashed_token returned"
        }`
      );
    } else {
      loginUrl =
        `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` +
        `?token_hash=${encodeURIComponent(hashedToken)}` +
        `&type=magiclink&next=/dashboard`;
    }
  } catch (err) {
    console.warn(
      `[stripe webhook] generateLink threw for ${email}: ${
        err instanceof Error ? err.message : "unknown"
      }`
    );
  }

  // Send tier-appropriate welcome via Resend (silent skip if no API key).
  const emailResult =
    tier === "premium"
      ? await sendPremiumWelcomeEmail({ to: email, firstName, loginUrl })
      : await sendCoreWelcomeEmail({ to: email, firstName, loginUrl });

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
      upgraded_from: effectiveUpgradedFrom,
    })
  );

  // Meta Purchase CAPI fire. Standard 'Purchase' event (NEVER OrderFormPurchase,
  // which is blocked Meta-side). content_name differentiates Core vs Premium.
  // Uses actual amount_total (so a Core→Premium upgrade with $50 coupon
  // reports value=247, not 297), falling back to list price if Stripe didn't
  // populate amount_total.
  after(
    fireServerPurchase({
      userId,
      email,
      firstName: firstName ?? undefined,
      lastName,
      source: `blueprint_${tier}_purchase`,
      valueUsd: paidUsd,
      contentName: tier === "core" ? "blueprint_core" : "blueprint_premium",
      stripeSessionId: session.id,
    })
  );

  // GA4 server-side purchase (Measurement Protocol) with the same actual
  // amount. Fire-and-forget; analytics never blocks fulfillment.
  after(
    sendGa4Purchase({
      transactionId: session.id,
      valueUsd: paidUsd,
      itemName: tier === "core" ? "blueprint_core" : "blueprint_premium",
      email,
    })
  );

  await markProcessed();
  return NextResponse.json({
    received: true,
    user_id: userId,
    tier,
    upgraded_from: upgradedFrom,
    welcome_email: emailResult,
  });
}
