import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { applyFreeTierSetup } from "@/lib/onboard-free-user";
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
// Idempotent free-tier signup. Creates the Supabase auth user (or returns the
// existing one), runs applyFreeTierSetup() to set free course_access + start
// the SeniorSafe trial (gated to never downgrade or reset), inserts a leads
// row, sends the magic link, and fans out to Kit + Twilio + Make + GHL via
// after(). Always returns 200 to the form unless input is invalid.
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

  // Free tier course_access + SeniorSafe trial start (single source of truth).
  const result = await applyFreeTierSetup({
    userId,
    email,
    firstName,
    lastName,
    phone,
    source,
  });

  // Send the magic link via Supabase auth (Custom SMTP routes through Resend).
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

  // Wrap fan-out in after() so Vercel keeps the function alive through the
  // network calls (Make / GHL / Kit / Twilio).
  after(result.fanout);

  return NextResponse.json({
    ok: true,
    user_id: userId,
    tier: "free",
    magic_link_sent: !otpErr,
    seniorsafe_trial_started: result.trialStarted,
  });
}
