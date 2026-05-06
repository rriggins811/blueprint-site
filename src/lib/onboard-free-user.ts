// Single source of truth for "this user just became a free Blueprint customer."
// Sets free-tier course_access (if not already paid), starts a SeniorSafe
// trial (if eligible), inserts a leads row, and returns the notification
// fan-out promise the caller wraps in after().
//
// Idempotent: re-running for the same userId never downgrades a paid tier
// or resets an existing trial. Trial is one-shot.
//
// Called from /api/freeguide-signup (email signup) AND /auth/callback when a
// first-time OAuth user lands without course_access yet.

import { createAdminSupabaseClient } from "./supabase-admin";
import { freeTierAccess, parseCourseAccess } from "./access";
import { isEligibleForTrialStart } from "./seniorsafe-trial";
import { notifyFreeSignup } from "./webhooks";

import type { SupabaseClient } from "@supabase/supabase-js";

export type OnboardArgs = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: string;
};

export type OnboardResult = {
  fanout: Promise<unknown[]>;
  freeTierGranted: boolean;
  trialStarted: boolean;
};

// Ambiguity-free charset: no I, O, 1, 0, L. 31 chars × 6 positions = 887M combos.
// Codes are shared verbally between family members; the exclusions matter.
const FAMILY_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomFamilyCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(
    bytes,
    (b) => FAMILY_CODE_CHARSET[b % FAMILY_CODE_CHARSET.length]
  ).join("");
}

async function generateUniqueFamilyCode(
  admin: SupabaseClient
): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomFamilyCode();
    const { data } = await admin
      .from("user_profile")
      .select("user_id")
      .eq("family_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate unique family code after 5 attempts");
}

// Extract a last name for the "The X Family" pattern. Order: explicit
// last_name on the profile, then args.lastName from the signup form, then
// last whitespace-separated token of firstName (Google OAuth often packs
// "First Last" into firstName when full_name parsing fails). Returns null
// if no usable last name is available — caller falls back to "Your Family".
function extractLastName(
  profileLastName: string | null | undefined,
  argsLastName: string | undefined,
  argsFirstName: string | undefined
): string | null {
  const candidates = [profileLastName, argsLastName].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0
  );
  if (candidates.length > 0) {
    const raw = candidates[0].trim();
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  if (argsFirstName && argsFirstName.includes(" ")) {
    const parts = argsFirstName.trim().split(/\s+/);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
    }
  }
  return null;
}

function familyNameFromLastName(lastName: string | null): string {
  return lastName ? `The ${lastName} Family` : "Your Family";
}

export async function applyFreeTierSetup(
  args: OnboardArgs
): Promise<OnboardResult> {
  const admin = createAdminSupabaseClient();

  const { data: profile } = await admin
    .from("user_profile")
    .select(
      "id, course_access, subscription_tier, trial_status, first_name, last_name, phone"
    )
    .eq("user_id", args.userId)
    .maybeSingle();

  const existingAccess = profile ? parseCourseAccess(profile.course_access) : null;
  const grantFree = !existingAccess || existingAccess.tier === "free";
  const startTrial = isEligibleForTrialStart(profile);

  const updates: Record<string, unknown> = {
    first_name: profile?.first_name ?? args.firstName ?? null,
    last_name: profile?.last_name ?? args.lastName ?? null,
    phone: profile?.phone ?? args.phone ?? null,
  };

  if (grantFree) {
    updates.course_access = freeTierAccess();
  }

  if (startTrial) {
    // Match the SeniorSafe app's trial schema. ai_consent stays false by default;
    // the SeniorSafe app collects consent in-app on first AI usage.
    updates.subscription_tier = "trial";
    updates.trial_status = "active";
    updates.trial_start_date = new Date().toISOString();
    updates.subscription_source = args.source;
  }

  if (profile) {
    const { error } = await admin
      .from("user_profile")
      .update(updates)
      .eq("id", profile.id);
    if (error) {
      console.error(`[onboard ${args.email}] update failed: ${error.message}`);
    }
  } else {
    const { error } = await admin
      .from("user_profile")
      .insert({ user_id: args.userId, ...updates });
    if (error) {
      console.error(`[onboard ${args.email}] insert failed: ${error.message}`);
    }
  }

  // Family-code provisioning. Both the maggie-chat and ai-chat edge functions
  // require user_profile.family_code to be set (joins against family_context
  // for Maggie's running summary and SeniorSafe AI's per-family ledger).
  // SeniorSafe app's own signup flow generates a family_code, but Blueprint
  // signups never went through that path — so prior to this fix every
  // /freeguide and Stripe-webhook user landed in the SeniorSafe app with
  // family_code=NULL and got "No family code found" the moment they opened
  // an AI tab. Idempotent: if a code already exists we leave it alone.
  // Service-role-only: protect_user_profile_columns() trigger blocks
  // family_code writes from anon JWTs; the admin client used above carries
  // the service_role key so this update succeeds.
  const { data: postUpdateProfile } = await admin
    .from("user_profile")
    .select("family_code, family_name, last_name")
    .eq("user_id", args.userId)
    .maybeSingle();

  if (postUpdateProfile && !postUpdateProfile.family_code) {
    try {
      const code = await generateUniqueFamilyCode(admin);
      const lastName = extractLastName(
        postUpdateProfile.last_name,
        args.lastName,
        args.firstName
      );
      const familyName =
        postUpdateProfile.family_name || familyNameFromLastName(lastName);

      const { error: ctxError } = await admin
        .from("family_context")
        .insert({ family_code: code });
      if (ctxError) {
        console.error(
          `[onboard ${args.email}] family_context insert failed: ${ctxError.message}`
        );
      }

      const familyUpdates: Record<string, unknown> = {
        family_code: code,
        family_name: familyName,
      };
      if (!postUpdateProfile.last_name && lastName) {
        familyUpdates.last_name = lastName;
      }

      const { error: famError } = await admin
        .from("user_profile")
        .update(familyUpdates)
        .eq("user_id", args.userId);
      if (famError) {
        console.error(
          `[onboard ${args.email}] family_code update failed: ${famError.message}`
        );
      }
    } catch (err) {
      console.error(
        `[onboard ${args.email}] family_code provisioning threw: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // Leads row for analytics. Duplicates ok — Phase B parallel-write window.
  const { error: leadErr } = await admin.from("leads").insert({
    form_type: "starter-guide",
    email: args.email,
    first_name: args.firstName ?? null,
    last_name: args.lastName ?? null,
    phone: args.phone ?? null,
    source: args.source,
    raw_payload: { source: args.source, user_id: args.userId, channel: "blueprint" },
  });
  if (leadErr) {
    console.warn(`[onboard ${args.email}] lead insert failed: ${leadErr.message}`);
  }

  // Fan-out promise — caller wraps in after().
  const fanout = notifyFreeSignup({
    email: args.email,
    firstName: args.firstName,
    lastName: args.lastName,
    phone: args.phone,
    source: args.source,
    signed_up_at: new Date().toISOString(),
    user_id: args.userId,
  });

  return { fanout, freeTierGranted: grantFree, trialStarted: startTrial };
}

// Stripe webhook helper. Starts a SeniorSafe trial alongside paid Blueprint
// access, with the same eligibility gate (never downgrade, never reset).
// Course access is set separately by the webhook caller.
export async function startSeniorsafeTrialIfEligible(
  userId: string,
  source: string
): Promise<{ trialStarted: boolean }> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("user_profile")
    .select("id, subscription_tier, trial_status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return { trialStarted: false };
  if (!isEligibleForTrialStart(profile)) return { trialStarted: false };

  const { error } = await admin
    .from("user_profile")
    .update({
      subscription_tier: "trial",
      trial_status: "active",
      trial_start_date: new Date().toISOString(),
      subscription_source: source,
    })
    .eq("id", profile.id);
  if (error) {
    console.warn(`[trial-start userId=${userId}] failed: ${error.message}`);
    return { trialStarted: false };
  }
  return { trialStarted: true };
}
