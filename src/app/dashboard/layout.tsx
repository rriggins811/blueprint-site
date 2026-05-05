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
    .select("course_access, first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const access = parseCourseAccess(profile?.course_access);
  const isPremium = access.tier === "premium";
  const isCore = access.tier === "core";
  const isFree = access.tier === "free";

  // No row at all (or unknown tier with empty arrays) = no Blueprint access at all.
  // This is a SeniorSafe-only user who navigated to /dashboard.
  if (!profile || (!isPaid(access) && access.modules.length === 0 && access.tools.length === 0)) {
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
                href="/pricing"
                className="font-medium text-amber-700 hover:text-amber-800"
              >
                Upgrade
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
      <div className="flex-1">{children}</div>
    </div>
  );
}

function FreePlanBanner() {
  return (
    <aside className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Free Plan. Unlock all 21 modules and 71 tools for $47.
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            One-time payment. Lifetime access. No recurring charge.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          See pricing
        </Link>
      </div>
    </aside>
  );
}

function CoreUpgradeBanner() {
  // Tier-aware Core upsell banner. Posts to /api/checkout with upgrade=1
  // so the server applies the $50-off coupon (server-side gate verifies the
  // user's current tier is core before honoring it).
  return (
    <aside className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Get Premium for $50 off. $247 instead of $297.
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Adds a personalized transition plan, a 60-minute strategy call
            with Ryan, and 90 days of email support.
          </p>
        </div>
        <form action="/api/checkout" method="POST">
          <input type="hidden" name="tier" value="premium" />
          <input type="hidden" name="upgrade" value="1" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Upgrade to Premium $247
          </button>
        </form>
      </div>
    </aside>
  );
}

function PremiumBanner({ expiresAt }: { expiresAt: Date | null }) {
  return (
    <aside className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Premium. Book your 60-minute strategy call with Ryan.
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

// Re-export type so other dashboard files can import without pulling parseCourseAccess directly.
export type { CourseAccess };
