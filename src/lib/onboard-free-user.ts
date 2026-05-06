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
