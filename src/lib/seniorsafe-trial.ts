// Pure helpers for reading SeniorSafe trial state off a user_profile row.
// Never mutates anything. The Blueprint dashboard reads this to render the
// cross-product banner. The actual trial mutations live in onboard-free-user.ts
// and the Stripe webhook handler.

export const SENIORSAFE_TRIAL_DAYS = 14;
export const SENIORSAFE_APP_URL = "https://app.seniorsafeapp.com";

export type SeniorsafeProfileFields = {
  subscription_tier: string | null;
  trial_status: string | null;
  trial_start_date: string | null;
};

export type SeniorsafeState =
  | { kind: "active"; daysRemaining: number; expiresAt: Date }
  | { kind: "expired" }
  | { kind: "paid" }
  | { kind: "premium_plus" }
  | { kind: "none" };

export function seniorsafeStateOf(
  profile: SeniorsafeProfileFields | null | undefined,
  now: Date = new Date()
): SeniorsafeState {
  if (!profile) return { kind: "none" };

  const tier = profile.subscription_tier;
  const status = profile.trial_status;
  const start = profile.trial_start_date;

  if (tier === "premium_plus") return { kind: "premium_plus" };
  if (tier === "paid") return { kind: "paid" };

  if (tier === "trial" && status === "active" && start) {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return { kind: "none" };
    const expiresAt = new Date(
      startDate.getTime() + SENIORSAFE_TRIAL_DAYS * 24 * 60 * 60 * 1000
    );
    const msRemaining = expiresAt.getTime() - now.getTime();
    if (msRemaining > 0) {
      const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
      return { kind: "active", daysRemaining, expiresAt };
    }
    return { kind: "expired" };
  }

  if (status === "expired" || status === "converted") {
    return { kind: "expired" };
  }

  return { kind: "none" };
}

// Eligibility gate for starting a fresh trial. Trial is one-shot:
// only start when subscription_tier is 'free' (or null) AND trial_status is 'none'.
// Takes only the two relevant fields so callers don't have to load trial_start_date.
export function isEligibleForTrialStart(
  profile:
    | { subscription_tier: string | null; trial_status: string | null }
    | null
    | undefined
): boolean {
  if (!profile) return true;
  const tierOk =
    profile.subscription_tier === null || profile.subscription_tier === "free";
  const statusOk =
    profile.trial_status === null || profile.trial_status === "none";
  return tierOk && statusOk;
}
