import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { PRICING, type CourseAccessKey } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook handler.
// Verifies signature, processes checkout.session.completed events,
// finds-or-creates the auth user by email, and grants course_access on user_profile.
// Idempotent: re-deliveries of the same event will overwrite the same key with the same data.
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
  const tier = session.metadata?.tier as "core" | "premium" | undefined;
  const courseAccessKey = session.metadata?.course_access_key as
    | CourseAccessKey
    | undefined;

  if (!email || !tier || !courseAccessKey) {
    return NextResponse.json(
      { error: "Session missing email or tier metadata" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  // Find-or-create the auth user.
  let userId = session.client_reference_id ?? null;

  if (!userId) {
    // Try to find an existing user by email.
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

  // Find-or-create user_profile row.
  const { data: profile } = await admin
    .from("user_profile")
    .select("id, course_access")
    .eq("user_id", userId)
    .maybeSingle();

  const grant = {
    purchased_at: new Date().toISOString(),
    stripe_payment_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    stripe_session_id: session.id,
  };

  // Premium includes Core access.
  const newAccess: Record<string, unknown> = {
    ...((profile?.course_access as Record<string, unknown>) ?? {}),
    [PRICING[tier].courseAccessKey]: grant,
  };
  if (tier === "premium") {
    newAccess[PRICING.core.courseAccessKey] = grant;
  }

  if (profile) {
    const { error: updErr } = await admin
      .from("user_profile")
      .update({ course_access: newAccess })
      .eq("id", profile.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await admin.from("user_profile").insert({
      user_id: userId,
      course_access: newAccess,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  // Best-effort magic-link email so the buyer can log into the dashboard.
  // Non-fatal if it fails. The buyer can also go to /login and request one.
  await admin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  return NextResponse.json({ received: true, user_id: userId, tier });
}
