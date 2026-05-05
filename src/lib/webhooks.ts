// Outbound notifications: Make.com (legacy redundant), Kit (subscriber tagging
// and nurture sequences), Twilio (SMS to Ryan), and GHL (legacy parallel write).
// All fire-and-forget by design — signup or purchase latency must never be
// blocked on a third-party API.

type Json = Record<string, unknown>;

// ---- Kit (formerly ConvertKit) ----
// Lifecycle tag IDs already provisioned in Ryan's Kit account.
// Mutually exclusive per SYSTEM_ARCHITECTURE.md (one of these per subscriber).
// Exclusivity is enforced in Kit via automations — this module just adds.
const KIT_TAG_FREE_TIER = 19396667;
const KIT_TAG_CORE_CUSTOMER = 19396672;
const KIT_TAG_PREMIUM_CUSTOMER = 19396675;

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

// Fire-and-forget on free signup. Returns immediately.
// Channels (parallel): Make webhook, Kit tag, Twilio SMS, GHL legacy webhook.
export function notifyFreeSignup(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: string;
  signed_up_at: string;
  user_id: string;
}): void {
  const makePayload = { ...payload, kind: "free_signup" };
  const sms = `New free Blueprint signup: ${nameFor(payload)} (${payload.email})`;

  void Promise.all([
    postJson(process.env.MAKE_FREESIGNUP_WEBHOOK_URL, makePayload, "make-free"),
    postJson(process.env.GHL_LEGACY_FREESIGNUP_WEBHOOK_URL, makePayload, "ghl-free"),
    kitAddTag(
      { email: payload.email, firstName: payload.firstName },
      KIT_TAG_FREE_TIER,
      "free-signup"
    ),
    twilioSendSms(sms, "free-signup"),
  ]);
}

// Fire-and-forget on new paid customer. Returns immediately.
// Channels (parallel): Make webhook, Kit tag (Core or Premium), Twilio SMS, GHL legacy.
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
}): void {
  const makePayload = { ...payload, kind: "new_paid" };
  const tagId =
    payload.tier === "premium"
      ? KIT_TAG_PREMIUM_CUSTOMER
      : KIT_TAG_CORE_CUSTOMER;
  const sms = `PAID ${payload.tier} $${payload.amount_usd}: ${nameFor(payload)} (${payload.email})`;

  void Promise.all([
    postJson(process.env.MAKE_PURCHASE_WEBHOOK_URL, makePayload, "make-paid"),
    postJson(process.env.GHL_LEGACY_PURCHASE_WEBHOOK_URL, makePayload, "ghl-paid"),
    kitAddTag(
      { email: payload.email, firstName: payload.firstName },
      tagId,
      `new-paid-${payload.tier}`
    ),
    twilioSendSms(sms, `new-paid-${payload.tier}`),
  ]);
}
