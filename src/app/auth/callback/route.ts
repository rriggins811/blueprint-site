import { NextResponse, after, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseCourseAccess, hasAnyAccess } from "@/lib/access";
import { applyFreeTierSetup } from "@/lib/onboard-free-user";

export const runtime = "nodejs";

// Handles Supabase magic-link AND OAuth (Google SSO) callbacks.
// Exchanges the ?code=... param for a session cookie. If the user has no
// course_access yet (first-time Google SSO signup), runs the same onboarding
// the email signup form runs: free-tier course_access + SeniorSafe trial start
// + Kit/Twilio/Make/GHL fan-out via after(). Then redirects to ?next= (or
// /dashboard).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?error=Missing+auth+code`, req.url)
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // Detect first-time signup (Google SSO most likely) and run onboarding.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("course_access")
      .eq("user_id", user.id)
      .maybeSingle();
    const access = parseCourseAccess(profile?.course_access);
    if (!hasAnyAccess(access)) {
      // First-time landing — most commonly an OAuth (Google) user that
      // bypassed /freeguide. Set up free-tier course_access, start the
      // SeniorSafe trial, fire the fan-out.
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const fullName =
        typeof meta.full_name === "string" && meta.full_name
          ? meta.full_name
          : typeof meta.name === "string" && meta.name
          ? meta.name
          : "";
      const firstName =
        (typeof meta.first_name === "string" && meta.first_name) ||
        fullName.split(" ")[0] ||
        undefined;
      const lastName =
        (typeof meta.last_name === "string" && meta.last_name) ||
        (fullName.split(" ").length > 1
          ? fullName.split(" ").slice(1).join(" ")
          : undefined);

      const result = await applyFreeTierSetup({
        userId: user.id,
        email: user.email,
        firstName,
        lastName,
        source: "google-oauth",
      });
      after(result.fanout);
    }
  }

  return NextResponse.redirect(new URL(next, req.url));
}
