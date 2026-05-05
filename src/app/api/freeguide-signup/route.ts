import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { freeTierAccess, parseCourseAccess } from "@/lib/access";
import { notifyFreeSignup } from "@/lib/webhooks";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

const SignupSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) =>
    v ? v : undefined
  ),
  source: z.string().trim().max(100).optional().default("rss-freeguide"),
});

// POST /api/freeguide-signup
// Idempotent free-tier signup. Find-or-create Supabase auth user, set
// course_access to the free shape, upsert leads row, send magic link, fire
// Make.com + GHL webhooks (fire-and-forget). Always returns 200 to the form
// unless the input is invalid.
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

  const { email, firstName, lastName, phone, source } = parsed.data;
  const admin = createAdminSupabaseClient();

  // Find or create auth user.
  let userId: string | null = null;
  {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (list.error) {
      return NextResponse.json({ ok: false, error: list.error.message }, { status: 500 });
    }
    const existing = list.data.users.find(
      (u) => u.email?.toLowerCase() === email
    );
    if (existing) {
      userId = existing.id;
    } else {
      const created = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName, phone },
      });
      if (created.error || !created.data.user) {
        return NextResponse.json(
          { ok: false, error: created.error?.message ?? "create_user_failed" },
          { status: 500 }
        );
      }
      userId = created.data.user.id;
    }
  }

  // Upsert user_profile with free-tier course_access. If the row already exists
  // and has a paid tier, leave it alone so re-submission cannot downgrade.
  const { data: profile } = await admin
    .from("user_profile")
    .select("id, course_access, first_name, last_name, phone")
    .eq("user_id", userId)
    .maybeSingle();

  const existingAccess = profile ? parseCourseAccess(profile.course_access) : null;
  const shouldGrantFree =
    !existingAccess || existingAccess.tier === "free";

  if (profile) {
    const updates: Record<string, unknown> = {
      first_name: profile.first_name ?? firstName,
      last_name: profile.last_name ?? lastName,
      phone: profile.phone ?? phone ?? null,
    };
    if (shouldGrantFree) {
      updates.course_access = freeTierAccess();
    }
    const { error: updErr } = await admin
      .from("user_profile")
      .update(updates)
      .eq("id", profile.id);
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await admin.from("user_profile").insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? null,
      course_access: freeTierAccess(),
    });
    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }
  }

  // Upsert leads row for analytics. The leads.form_type check enforces a
  // closed set ('starter-guide' | 'contact'); 'starter-guide' fits this flow.
  const { error: leadErr } = await admin
    .from("leads")
    .insert({
      form_type: "starter-guide",
      email,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? null,
      source,
      raw_payload: { ...parsed.data, user_id: userId },
    });
  if (leadErr) {
    // Non-fatal: leads is for analytics, not gating.
    console.warn(`[freeguide-signup] lead insert failed: ${leadErr.message}`);
  }

  // Send the magic link via Supabase auth (Resend takeover comes Day 4).
  const { error: otpErr } = await admin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${SITE.url}/auth/callback`,
      shouldCreateUser: false,
    },
  });
  if (otpErr) {
    console.warn(`[freeguide-signup] magic link send failed: ${otpErr.message}`);
  }

  // Fire Make.com + GHL legacy webhooks (parallel, non-blocking).
  notifyFreeSignup({
    email,
    firstName,
    lastName,
    phone,
    source,
    signed_up_at: new Date().toISOString(),
    user_id: userId,
  });

  return NextResponse.json({
    ok: true,
    user_id: userId,
    tier: "free",
    magic_link_sent: !otpErr,
  });
}
