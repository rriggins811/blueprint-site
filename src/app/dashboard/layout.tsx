import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { signOut } from "./actions";
import { SITE } from "@/lib/site";
import {
  parseCourseAccess,
  isPaid,
  type CourseAccess,
} from "@/lib/access";
import {
  seniorsafeStateOf,
  SENIORSAFE_APP_URL,
  type SeniorsafeState,
} from "@/lib/seniorsafe-trial";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select(
      "course_access, first_name, subscription_tier, trial_status, trial_start_date"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const access = parseCourseAccess(profile?.course_access);
  const isPremium = access.tier === "premium";
  const isCore = access.tier === "core";
  const isFree = access.tier === "free";
  const ssState = seniorsafeStateOf(profile);

  // Free pivot (Jul 24 2026): the Blueprint is free for every account, so any
  // user with a profile row gets in (including SeniorSafe-only users). Only a
  // missing profile row still bounces.
  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No course access on this account
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          The email <strong>{user.email}</strong> does not have a Blueprint
          account on file. If you signed up under a different email, log out and
          log back in with that one.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex justify-center rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Back to the Blueprint
        </Link>
        <form action={signOut} className="mt-3">
          <button type="submit" className="text-sm text-neutral-500 underline">
            Log out
          </button>
        </form>
      </main>
    );
  }

  const premiumExpiresAt =
    isPremium && access.purchased_at
      ? new Date(
          new Date(access.purchased_at).getTime() +
            SITE.premiumSupportDays * 24 * 60 * 60 * 1000
        )
      : null;

  const tierBadge = isPremium ? "Premium" : access.tier === "core" ? "Core" : "Free";
  const tierBadgeColor = isPremium
    ? "bg-amber-100 text-amber-800"
    : access.tier === "core"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-neutral-200 text-neutral-700";

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            {SITE.shortName}
            <span
              className={
                "ml-2 rounded-full px-2 py-0.5 text-xs font-medium " + tierBadgeColor
              }
            >
              {tierBadge}
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {isFree || isCore ? (
              <Link
                href="/roadmap"
                className="font-medium text-amber-700 hover:text-amber-800"
              >
                Get the Roadmap
              </Link>
            ) : null}
            {isPremium ? (
              <a
                href={`mailto:${SITE.supportEmail}?subject=Premium%20support`}
                className="text-neutral-600 hover:text-neutral-900"
              >
                Email Ryan
              </a>
            ) : null}
            <Link
              href="/dashboard/settings"
              className="text-neutral-600 hover:text-neutral-900"
            >
              Settings
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      {isFree ? <FreePlanBanner /> : null}
      {isCore ? <CoreUpgradeBanner /> : null}
      {isPremium ? <PremiumBanner expiresAt={premiumExpiresAt} /> : null}
      <SeniorSafeBanner state={ssState} blueprintTier={access.tier} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function FreePlanBanner() {
  // Free pivot: the old $47 upsell is gone. The nudge is the free Roadmap,
  // honest about its gate (intake form with sensitive info + a call with Ryan).
  return (
    <aside className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Go ahead and get the entire Roadmap. It is free too.
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            It starts with an intake form that asks for real detail, then a
            call with Ryan. He reviews every application personally, and you
            build the written plan together.
          </p>
        </div>
        <Link
          href="/roadmap/apply"
          className="inline-flex items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          Apply for the Roadmap
        </Link>
      </div>
    </aside>
  );
}

function CoreUpgradeBanner() {
  // Legacy Core buyers see the same Roadmap nudge (the $247 upgrade is gone;
  // the Roadmap is free by application for them too).
  return <FreePlanBanner />;
}

function PremiumBanner({ expiresAt }: { expiresAt: Date | null }) {
  return (
    <aside className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Book your 60-minute planning call with Ryan.
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Come ready to talk through your family&rsquo;s situation. You&rsquo;re
            welcome to invite a sibling.
          </p>
          {expiresAt ? (
            <p className="mt-0.5 text-xs text-amber-800">
              Premium support active until{" "}
              {expiresAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              .
            </p>
          ) : null}
        </div>
        <a
          href={SITE.premiumCalBookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          Book the call
        </a>
      </div>
    </aside>
  );
}

function SeniorSafeBanner({
  state,
  blueprintTier,
}: {
  state: SeniorsafeState;
  blueprintTier: "free" | "core" | "premium";
}) {
  // Active trial: show countdown and link to the app.
  if (state.kind === "active") {
    const days = state.daysRemaining;
    return (
      <aside className="border-b border-sky-200 bg-sky-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-sky-900">
              Your SeniorSafe app trial is active for {days} more day
              {days === 1 ? "" : "s"}.
            </p>
            <p className="mt-0.5 text-xs text-sky-800">
              Daily check-ins, medication tracking, document vault, and family
              coordination — included with your Blueprint signup.
            </p>
          </div>
          <a
            href={SENIORSAFE_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Open the app
          </a>
        </div>
      </aside>
    );
  }

  // Expired trial AND user is still Blueprint free: encourage SeniorSafe resub.
  // (For Blueprint paid customers we don't push SeniorSafe resub here — the
  // SeniorSafe app handles that flow inside its own dashboard.)
  if (state.kind === "expired" && blueprintTier === "free") {
    return (
      <aside className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-neutral-900">
              Your SeniorSafe trial ended.
            </p>
            <p className="mt-0.5 text-xs text-neutral-700">
              Resubscribe at $14.99/mo for full app access (Premium) or
              $39.99/mo (Premium+ with Maggie).
            </p>
          </div>
          <a
            href={SENIORSAFE_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:border-neutral-500"
          >
            Resubscribe
          </a>
        </div>
      </aside>
    );
  }

  // Paid SeniorSafe user (any Blueprint tier): "you're in, go use the app."
  if (state.kind === "paid" || state.kind === "premium_plus") {
    return (
      <aside className="border-b border-emerald-200 bg-emerald-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">
              You have full SeniorSafe access.
              {state.kind === "premium_plus"
                ? " Maggie is included with your Premium+ plan."
                : ""}
            </p>
          </div>
          <a
            href={SENIORSAFE_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Open the app
          </a>
        </div>
      </aside>
    );
  }

  // No trial state to surface (kind === "none" or expired-and-paid).
  return null;
}

// Re-export type so other dashboard files can import without pulling parseCourseAccess directly.
export type { CourseAccess };
