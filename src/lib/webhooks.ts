// Outbound notifications: GHL legacy webhook URL (parallel write), GHL
// ghl-proxy direct API (the May-15 ghl-proxy migration — see
// memory/sop_ghl_operations.md), and Twilio SMS to Ryan.
//
// Kit (formerly ConvertKit) was fully retired May 18 (Phase 6). The
// May-7 direct-Kit-API tagging that replaced the broken Make scenarios
// served as a bridge while we migrated nurture sequences to GHL. With
// GHL nurture workflows confirmed active on Monday-afternoon organic
// traffic, Kit was removed and KIT_API_KEY env var deleted from both
// blueprint-site Vercel and Supabase Edge Function secrets. The
// previously-deactivated Make scenarios 4994110 / 4994124 / 4994125
// remain in Make in deactivated state for forensic purposes.
//
// All fan-out fires fire-and-forget by design — signup or purchase
// latency must never be blocked on a third-party API.

import { upsertGhlContactWithTags, GHL_TAGS } from "@/lib/ghl-proxy";

type Json = Record<string, unknown>;

// ---- Twilio ----
async function twilioSendSms(body: string, label: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.TWILIO_TO_NUMBER;
  if (
    !sid ||
    !token ||
    !fromNumber ||
    !toNumber ||
    /PLACEHOLDER/i.test(sid) ||
    /PLACEHOLDER/i.test(token)
  ) {
    console.warn(`[twilio ${label}] skipped, Twilio env not set`);
    return;
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: body,
        }).toString(),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[twilio ${label}] ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(
      `[twilio ${label}] failed: ${err instanceof Error ? err.message : "unknown"}`
    );
  }
}

// ---- ghl-proxy direct-API tag wrapper ----
// Adapter around upsertGhlContactWithTags that returns void + logs (matching
// the fire-and-forget signature of postJson / twilioSendSms so the
// orchestrators below can fan out uniformly via Promise.all).
async function ghlProxyUpsertAndTag(
  subscriber: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  },
  tag: string,
  source: string,
  label: string
): Promise<void> {
  try {
    const res = await upsertGhlContactWithTags(
      {
        email: subscriber.email,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
        source,
      },
      [tag]
    );
    if (!res.ok) {
      console.warn(
        `[ghl-proxy ${label}] failed status=${res.status} error=${res.error}`
      );
      return;
    }
    // Phase 3 verification logging — drop after Phase 5 sign-off.
    console.info(
      `[ghl-proxy ${label}] ok contactId=${res.contactId} tag=${tag}`
    );
  } catch (err) {
    console.warn(
      `[ghl-proxy ${label}] threw: ${err instanceof Error ? err.message : "unknown"}`
    );
  }
}

// ---- Generic webhook POST (used by GHL legacy fan-out) ----
async function postJson(
  url: string | undefined,
  payload: Json,
  label: string
): Promise<void> {
  if (!url || /PLACEHOLDER/i.test(url)) {
    console.warn(`[webhook ${label}] skipped, no URL configured`);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[webhook ${label}] ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn(
      `[webhook ${label}] failed: ${err instanceof Error ? err.message : "unknown"}`
    );
  }
}

// ---- Helpers for SMS body composition ----
function nameFor(p: { firstName?: string; lastName?: string }): string {
  const parts = [p.firstName, p.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unknown";
}

// ---- Public orchestrators ----
//
// These return Promise<unknown[]> rather than firing internally. Callers wrap
// in `after()` from next/server so Vercel keeps the function alive until the
// fan-out completes. Bare fire-and-forget (`void Promise.all(...)`) is unreliable
// on Vercel because the runtime may terminate the worker as soon as the route
// returns its response, cancelling in-flight fetches.

export function notifyFreeSignup(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: string;
  signed_up_at: string;
  user_id: string;
}): Promise<unknown[]> {
  const makePayload = { ...payload, kind: "free_signup" };
  const sms = `New free Blueprint signup: ${nameFor(payload)} (${payload.email})`;

  return Promise.all([
    // Legacy GHL webhook — leave as-is, working per Ryan's confirmation.
    // The webhook hits a GHL inbound-webhook trigger which fires the
    // pre-existing Free Guide Trial Nurture workflow (the one Kit used to
    // drive). All freeguide / lead-magnet signups now route through here.
    postJson(process.env.GHL_LEGACY_FREESIGNUP_WEBHOOK_URL, makePayload, "ghl-free"),
    twilioSendSms(sms, "free-signup"),
  ]);
}

export function notifyNewPaidCustomer(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  tier: "core" | "premium";
  amount_usd: number;
  stripe_session_id: string;
  stripe_customer_id?: string;
  user_id: string;
  upgraded_from?: "free" | "core" | "premium";
}): Promise<unknown[]> {
  const makePayload = { ...payload, kind: "new_paid" };
  const sms = `PAID ${payload.tier} $${payload.amount_usd}: ${nameFor(payload)} (${payload.email})`;

  // ghl-proxy direct-API tag (Block C Phase 3, May-15). Per the locked
  // tag taxonomy in memory/sop_ghl_operations.md, paid Blueprint purchases
  // tag with product-blueprint-core or product-blueprint-premium. These
  // fire alongside (NOT replace) the legacy GHL webhook — once Phase 5
  // verifies the proxy path lands tags correctly we can drop the legacy
  // GHL webhook URL fan-out.
  const ghlTag =
    payload.tier === "premium"
      ? GHL_TAGS.PRODUCT_BLUEPRINT_PREMIUM
      : GHL_TAGS.PRODUCT_BLUEPRINT_CORE;

  return Promise.all([
    // Legacy GHL webhook — leave as-is during Phase 3 verification window.
    // Drop after Phase 5 confirms ghl-proxy parity.
    postJson(process.env.GHL_LEGACY_PURCHASE_WEBHOOK_URL, makePayload, "ghl-paid"),
    // GHL direct-API via ghl-proxy Edge Function — the future-state path.
    ghlProxyUpsertAndTag(
      {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      },
      ghlTag,
      `blueprint_${payload.tier}_purchase`,
      `paid-${payload.tier}`
    ),
    twilioSendSms(sms, `new-paid-${payload.tier}`),
  ]);
}

// Subscription cancellation → applies seniorsafe-churned GHL tag.
// Today this fires only for SeniorSafe subscription cancellations (Blueprint
// Core/Premium are one-time purchases). Senior-safe stripe-webhook ALSO
// applies this tag from its own customer.subscription.deleted handler —
// double-tagging is safe (GHL tag-on-contact is idempotent), and keeping
// both ensures coverage if either Stripe webhook endpoint is ever paused.
// Replaced the May-7 Kit churn tag (KIT_TAG_SENIORSAFE_CHURNED 19444482)
// in Phase 6 (May 18) when Kit was fully retired.
export function notifyChurn(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  prior_tier?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  canceled_at?: string;
}): Promise<unknown[]> {
  return Promise.all([
    ghlProxyUpsertAndTag(
      {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
      },
      GHL_TAGS.SENIORSAFE_CHURNED,
      "seniorsafe_churn",
      "churn"
    ),
  ]);
}
