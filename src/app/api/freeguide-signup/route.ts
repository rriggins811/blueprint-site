import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { mintActivationToken } from "@/lib/activation-token";
import { sendFreeGuideEmail } from "@/lib/email/resend";
import { notifyFreeSignup } from "@/lib/webhooks";

export const runtime = "nodejs";

const SignupSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  firstName: z.string().trim().min(1).max(100),
  // lastName is OPTIONAL — /freeguide form lets users skip it, and the
  // newer /guides lead-magnet form doesn't collect it at all. Empty
  // string + missing both normalize to undefined.
  lastName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) =>
    v ? v : undefined
  ),
  source: z.string().trim().max(100).optional().default("rss-freeguide"),
  // Optional lead-magnet slug. When present, the welcome email template
  // adds a direct PDF link section for that magnet (so the user gets
  // immediate access while the activation/dashboard flow plays out).
  // When absent, the standard Simple Blueprint activation email fires
  // unchanged. Slug format: kebab-case, must match a known magnet on
  // rss-site lib/lead-magnets.ts. Lookup is permissive — unknown slug
  // is logged + silently downgraded to the standard email (won't fail
  // the signup).
  magnet: z.string().trim().max(80).optional(),
});

// POST /api/freeguide-signup
//
// New flow (replaces the magic-link approach because Outlook Safe Links
// pre-fetches magic-link URLs and consumes the one-time code, breaking auth
// for Outlook / Hotmail recipients):
//
//   1. Validate input.
//   2. Mint a signed activation token (HMAC-SHA256, 7-day expiry, payload
//      contains email + name).
//   3. Send the freeguide email via Resend with the PDF link and an
//      "Activate my free account" CTA pointing at /activate?token=...
//   4. Insert a leads row in Supabase (analytics, parallel-write redundancy).
//   5. Fire fan-out (Make + GHL legacy + Kit free-tier tag + Twilio SMS).
//   6. Return 200.
//
// We do NOT create the Supabase auth user here. The user is created on
// /activate when they set a password. This means until they activate they
// have no auth account, no course_access, and no SeniorSafe trial.
// applyFreeTierSetup runs on the /activate POST instead.
//
// Always returns 200 to the form unless input is invalid.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = await req.json();
    } else {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, firstName, lastName, phone, source, magnet } = parsed.data;
  const admin = createAdminSupabaseClient();

  // Mint the activation token. Self-contained — does not touch Supabase auth.
  // mintActivationToken's signature requires lastName as string; fall back
  // to empty string when the form didn't collect it (the magnet flow).
  const activationToken = mintActivationToken({
    email,
    firstName,
    lastName: lastName ?? "",
  });

  // Send the activation email. Failure here is logged but not fatal — the
  // user will see "check your email" on the rss-site /freeguide form anyway,
  // and the GHL/Twilio fan-out still notifies Ryan.
  //
  // When `magnet` is present (lead-magnet flow from /guides), the email
  // template adds a direct PDF link section pointing at the magnet so
  // the user gets immediate access alongside the activation CTA.
  const emailResult = await sendFreeGuideEmail({
    to: email,
    firstName,
    activationToken,
    magnetSlug: magnet,
  });
  if (!emailResult.ok) {
    console.warn(`[freeguide-signup] activation email failed: ${emailResult.reason}`);
  }

  // Leads row for analytics. Parallel-write window — duplicates ok.
  // form_type reflects whether this is a generic starter-guide signup or
  // a magnet-specific entry door, so downstream queries can segment by
  // funnel. Matches the form_type rss-site writes for the same signup
  // (constraint relaxed via leads_form_type_allow_lead_magnet_prefix
  // migration on 2026-05-18 to allow lead-magnet-* values).
  const leadFormType = magnet ? `lead-magnet-${magnet}` : "starter-guide";
  const { error: leadErr } = await admin.from("leads").insert({
    form_type: leadFormType,
    email,
    first_name: firstName,
    last_name: lastName ?? null,
    phone: phone ?? null,
    source,
    raw_payload: {
      email,
      firstName,
      lastName,
      phone,
      source,
      channel: "blueprint-activation",
      ...(magnet ? { magnet } : {}),
    },
  });
  if (leadErr) {
    console.warn(`[freeguide-signup] lead insert failed: ${leadErr.message}`);
  }

  // Fan out. user_id is undefined at this stage because the user has not
  // activated yet. Downstream consumers should treat the absence as "pending
  // activation". The Twilio SMS still names the person + email so Ryan can
  // act if needed.
  after(
    notifyFreeSignup({
      email,
      firstName,
      lastName: lastName ?? undefined,
      phone,
      source,
      signed_up_at: new Date().toISOString(),
      user_id: "pending-activation",
    })
  );

  return NextResponse.json({
    ok: true,
    activation_email_sent: emailResult.ok,
    activation_email_id: emailResult.ok ? emailResult.id : null,
  });
}
