// Outbound notifications: Make.com (legacy redundant), Kit (subscriber tagging
// and nurture sequences), Twilio (SMS to Ryan), GHL legacy webhook URL (parallel
// write), and GHL ghl-proxy direct API (the May-15 ghl-proxy migration —
// see memory/sop_ghl_operations.md).
// All fire-and-forget by design — signup or purchase latency must never be
// blocked on a third-party API.

import { upsertGhlContactWithTags, GHL_TAGS } from "@/lib/ghl-proxy";

type Json = Record<string, unknown>;

// ---- Kit (formerly ConvertKit) ----
// Lifecycle tag IDs already provisioned in Ryan's Kit account.
// Mutually exclusive per SYSTEM_ARCHITECTURE.md (one of these per subscriber).
// Exclusivity is enforced in Kit via automations — this module just adds.
const KIT_TAG_FREE_TIER = 19396667;
const KIT_TAG_CORE_CUSTOMER = 19396672;
const KIT_TAG_PREMIUM_CUSTOMER = 19396675;
// Make-bypass tags (added 2026-05-07 after Make broken-webhook-resource diagnosis).
// These previously routed via Make.com scenarios (4994110/4994124/4994125)
// which exhibited a 40s ModuleTimeoutError at gateway:CustomWebHook on every
// execution despite the gateway returning 200 to the caller. Recreating the
// hooks didn't fix it. Bypass Make entirely — apply tags directly.
const KIT_TAG_FREEGUIDE_TRIAL = 19444443;
const KIT_TAG_SENIORSAFE_CHURNED = 19444482;

const KIT_BASE = "https://api.kit.com/v4";

async function kitAddTag(
  subscriber: { email: string; firstName?: string },
  tagId: number,
  label: string
): Promise<void> {
  const key = process.env.KIT_API_KEY;
  if (!key || /PLACEHOLDER/i.test(key)) {
    console.warn(`[kit ${label}] skipped, KIT_API_KEY not set`);
    return;
  }
  // Kit v4: two-step create-then-tag.
  //   1. POST /v4/subscribers with {email_address, first_name} → returns subscriber.id (idempotent)
  //   2. POST /v4/tags/:tag_id/subscribers/:sub_id → tags
  // Auth header: X-Kit-Api-Key. Authorization: Bearer is reserved for OAuth.
  try {
    const createRes = await fetch(`${KIT_BASE}/subscribers`, {
      method: "POST",
      headers: {
        "X-Kit-Api-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: subscriber.email,
        first_name: subscriber.firstName,
      }),
    });
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => "");
      console.warn(
        `[kit ${label}] create ${createRes.status} ${createRes.statusText} ${text.slice(0, 200)}`
      );
      return;
    }
    const createBody = (await createRes.json()) as {
      subscriber?: { id?: number };
    };
    const subscriberId = createBody.subscriber?.id;
    if (!subscriberId) {
      console.warn(`[kit ${label}] create returned no subscriber id`);
      return;
    }
    const tagRes = await fetch(
      `${KIT_BASE}/tags/${tagId}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: { "X-Kit-Api-Key": key },
      }
    );
    if (!tagRes.ok) {
      const text = await tagRes.text().catch(() => "");
      console.warn(
        `[kit ${label}] tag ${tagRes.status} ${tagRes.statusText} ${text.slice(0, 200)}`
      );
    }
  } catch (err) {
    console.warn(
      `[kit ${label}] failed: ${err instanceof Error ? err.message : "unknown"}`
    );
  }
}

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
// the fire-and-forget signature of kitAddTag / postJson / twilioSendSms so
// the orchestrators below can fan out uniformly via Promise.all).
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

// ---- Generic webhook POST (used by Make.com + GHL legacy) ----
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
    postJson(process.env.GHL_LEGACY_FREESIGNUP_WEBHOOK_URL, makePayload, "ghl-free"),
    // Direct Kit tagging — applies BOTH the blueprint-free-tier (existing
    // behavior, drives Blueprint course nurture) AND freeguide-trial
    // (replaces broken Make Scenario 1 — drives the 6-email Free Guide
    // Trial Nurture sequence in Kit).
    kitAddTag(
      { email: payload.email, firstName: payload.firstName },
      KIT_TAG_FREE_TIER,
      "free-signup"
    ),
    kitAddTag(
      { email: payload.email, firstName: payload.firstName },
      KIT_TAG_FREEGUIDE_TRIAL,
      "freeguide-trial"
    ),
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
  const tagId =
    payload.tier === "premium"
      ? KIT_TAG_PREMIUM_CUSTOMER
      : KIT_TAG_CORE_CUSTOMER;
  const sms = `PAID ${payload.tier} $${payload.amount_usd}: ${nameFor(payload)} (${payload.email})`;

  // ghl-proxy direct-API tag (Block C Phase 3, May-15). Per the locked
  // tag taxonomy in memory/sop_ghl_operations.md, paid Blueprint purchases
  // tag with product-blueprint-core or product-blueprint-premium. These
  // fire alongside (NOT replace) the legacy GHL webhook + Kit calls — once
  // Phase 5 verifies the proxy path lands tags correctly we can drop the
  // legacy GHL webhook URL fan-out.
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
    // Direct Kit tagging — applies the blueprint-core-customer or
    // blueprint-premium-customer tag (drives Blueprint course nurture).
    // Note: SeniorSafe-Premium tagging is owned by the senior-safe Stripe
    // webhook (which fires on actual SeniorSafe subscription events), NOT
    // by blueprint-site (whose 'premium' tier means Blueprint Premium course,
    // a one-time purchase). The previous Make Scenario 2 conflation is
    // dropped along with the broken webhook.
    kitAddTag(
      { email: payload.email, firstName: payload.firstName },
      tagId,
      `new-paid-${payload.tier}`
    ),
    twilioSendSms(sms, `new-paid-${payload.tier}`),
  ]);
}

// Subscription cancellation → applies seniorsafe-churned tag directly.
// Today this fires only for SeniorSafe subscription cancellations (Blueprint
// Core/Premium are one-time purchases). Senior-safe stripe-webhook ALSO
// applies this tag from its own customer.subscription.deleted handler —
// double-tagging is safe (Kit tag-on-subscriber is idempotent), and keeping
// both ensures coverage if either Stripe webhook endpoint is ever paused.
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
    kitAddTag(
      { email: payload.email, firstName: payload.firstName },
      KIT_TAG_SENIORSAFE_CHURNED,
      "seniorsafe-churned"
    ),
  ]);
}
