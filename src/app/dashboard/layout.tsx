import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { signOut } from "./actions";
import { SITE, premiumExpiresFromGrant } from "@/lib/site";

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

  const access = (profile?.course_access ?? {}) as Record<string, unknown>;
  const hasCore = Boolean(access.blueprint_core);
  const hasPremium = Boolean(access.blueprint_premium);
  const premiumGrant = access.blueprint_premium;
  const premiumExpiresAt = hasPremium ? premiumExpiresFromGrant(premiumGrant) : null;

  if (!hasCore && !hasPremium) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No course access on this account
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          The email <strong>{user.email}</strong> does not have a Blueprint
          purchase on file. If you bought under a different email, log out and
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

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            {SITE.shortName}
            {hasPremium ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Premium
              </span>
            ) : null}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {hasPremium ? (
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
      {hasPremium ? (
        <PremiumBanner expiresAt={premiumExpiresAt} />
      ) : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}

function PremiumBanner({ expiresAt }: { expiresAt: Date | null }) {
  return (
    <aside className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          <p className="font-semibold text-amber-900">
            Premium — book your 60-minute strategy call with Ryan
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
