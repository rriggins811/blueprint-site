// Outbound webhook helpers. Used to notify Make.com (Twilio SMS to Ryan + Kit
// tag operations) and the GHL legacy endpoint (parallel write during the
// transition window per SYSTEM_ARCHITECTURE.md). Fire-and-forget by default
// so signup or webhook latency never blocks the user.

type Json = Record<string, unknown>;

async function fireOnce(url: string | undefined, payload: Json, label: string): Promise<void> {
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

// Fire-and-forget. Returns immediately; errors are logged, never thrown.
export function notifyFreeSignup(payload: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: string;
  signed_up_at: string;
  user_id: string;
}): void {
  void Promise.all([
    fireOnce(process.env.MAKE_FREESIGNUP_WEBHOOK_URL, { ...payload, kind: "free_signup" }, "make-free"),
    fireOnce(process.env.GHL_LEGACY_FREESIGNUP_WEBHOOK_URL, { ...payload, kind: "free_signup" }, "ghl-free"),
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
}): void {
  void Promise.all([
    fireOnce(process.env.MAKE_PURCHASE_WEBHOOK_URL, { ...payload, kind: "new_paid" }, "make-paid"),
    fireOnce(process.env.GHL_LEGACY_PURCHASE_WEBHOOK_URL, { ...payload, kind: "new_paid" }, "ghl-paid"),
  ]);
}
