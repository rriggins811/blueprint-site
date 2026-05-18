/**
 * Resend Audiences write helper.
 *
 * Wraps Resend's POST /audiences/{id}/contacts endpoint so signup endpoints
 * can sync new contacts into the newsletter audience alongside the existing
 * GHL upsert. Resend's Contacts API is upsert-by-email — calling it again
 * for an existing contact is safe (updates first_name/last_name if changed,
 * keeps unsubscribe state untouched).
 *
 * Uses a SEPARATE API key from the transactional RESEND_API_KEY because
 * audiences/broadcasts require Full-Access permission, while the
 * transactional welcome-email path only needs Send-Only. Keeping the two
 * keys split limits blast radius if either leaks.
 *
 * Required Vercel env vars:
 *   RESEND_AUDIENCES_API_KEY        — Full-Access Resend key
 *   RESEND_NEWSLETTER_AUDIENCE_ID   — UUID of the newsletter audience
 *                                     (defaults to the locked May 18, 2026
 *                                     "General" audience UUID)
 *
 * Best-effort: every error path returns `{ok:false, reason}` and the
 * caller MUST treat it as non-blocking — a Resend outage cannot stop a
 * Blueprint signup from completing.
 */

// Default to the "General" audience UUID confirmed live on May 18, 2026.
// Override via RESEND_NEWSLETTER_AUDIENCE_ID env var if/when a second
// audience is created.
const DEFAULT_AUDIENCE_ID = "4b294c03-f551-4db8-8d5c-0ed7e46e6683";

export type ResendUpsertResult =
  | { ok: true; contactId: string }
  | { ok: false; reason: string };

export async function upsertResendAudienceContact(args: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<ResendUpsertResult> {
  const key = process.env.RESEND_AUDIENCES_API_KEY;
  if (!key || /PLACEHOLDER/i.test(key)) {
    return { ok: false, reason: "no_audiences_key" };
  }
  const audienceId =
    process.env.RESEND_NEWSLETTER_AUDIENCE_ID || DEFAULT_AUDIENCE_ID;

  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: args.email,
          first_name: (args.firstName ?? "").trim() || undefined,
          last_name: (args.lastName ?? "").trim() || undefined,
          unsubscribed: false,
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    type Body =
      | { id?: string; object?: string }
      | { statusCode?: number; message?: string; name?: string };
    const body = (await res.json().catch(() => ({}))) as Body;
    if (!res.ok) {
      const msg =
        ("message" in body && body.message) ||
        `http_${res.status}`;
      return { ok: false, reason: String(msg) };
    }
    const id = ("id" in body && body.id) || "unknown";
    return { ok: true, contactId: id };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}
