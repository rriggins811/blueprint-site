import { NextResponse, after, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseCourseAccess, hasAnyAccess } from "@/lib/access";
import { applyFreeTierSetup } from "@/lib/onboard-free-user";
import { safeNext } from "@/lib/safe-next";

export const runtime = "nodejs";

// Turn a Supabase/GoTrue error_code into human-friendly login-page copy.
function friendlyAuthError(errorCode: string | null, fallback: string): string {
  switch (errorCode) {
    case "otp_expired":
      return "That sign-in link has expired or was already used. Request a new one below.";
    case "access_denied":
      return "That sign-in link is no longer valid. Request a new one below.";
    default:
      return fallback;
  }
}

// Handles Supabase magic-link / password-recovery (token_hash) AND OAuth
// (Google SSO, ?code) callbacks, all exchanged through the SSR cookie client so
// the session is actually set. If the user has no course_access yet (first-time
// Google SSO signup), runs the same onboarding the email signup form runs:
// free-tier course_access + SeniorSafe trial start + fan-out via after(). Then
// redirects to a sanitized ?next= (default /dashboard).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));

  // 1. Surface GoTrue error params (expired/burned links) with a real message
  //    instead of masking everything as "Missing auth code".
  const errParam =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const errCode = url.searchParams.get("error_code");
  if (errParam || errCode) {
    const msg = friendlyAuthError(errCode, errParam ?? "Sign-in link error");
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url)
    );
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("This sign-in link is missing its token or has already been used. Request a new one below.")}`,
        req.url
      )
    );
  }

  const supabase = await createServerSupabaseClient();

  // 2. Exchange the credential for a session on the cookie client. Magic-link
  //    and password-recovery emails (generated via admin.generateLink) carry a
  //    token_hash + type and are verified with verifyOtp; OAuth carries ?code.
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        type: otpType ?? "magiclink",
        token_hash: tokenHash,
      })
    : await supabase.auth.exchangeCodeForSession(code!);
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
