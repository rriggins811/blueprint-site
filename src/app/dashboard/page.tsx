import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MODULES } from "@/lib/blueprint-modules";
import { TOOLS } from "@/lib/tools-registry";
import {
  parseCourseAccess,
  isModuleUnlocked,
  isToolUnlocked,
  isPaid,
} from "@/lib/access";

export const metadata = { title: "Your Blueprint" };

export default async function DashboardHome() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profile")
    .select("course_access, first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const access = parseCourseAccess(profile?.course_access);
  const firstName = profile?.first_name ?? null;
  const hasPremium = access.tier === "premium";
  const isFreeTier = access.tier === "free";

  // Premium-only modules hide entirely from non-Premium users (rather than
  // showing as locked). Mixing 1 premium-locked card into a 21-card list
  // muddies the upgrade path. The /pricing page makes the Premium pitch.
  const visibleModules = MODULES.filter((m) => !m.premiumOnly || hasPremium);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mt-2 text-neutral-600">
          {isPaid(access)
            ? "Start at Module 00. Or jump to wherever your family is right now. Self-paced. Lifetime access."
            : "Module 00 is yours. The rest unlock with Blueprint Core for $47, lifetime access."}
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Modules</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {isPaid(access)
            ? `${visibleModules.length} modules. Self-paced.`
            : `1 of 21 unlocked.`}
        </p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleModules.map((m) => {
            const unlocked = isModuleUnlocked(m.slug, access);
            return (
              <li key={m.slug}>
                <ModuleCard
                  number={m.number}
                  title={m.title}
                  summary={m.summary}
                  toolCount={m.toolCount}
                  href={`/dashboard/${m.slug}`}
                  unlocked={unlocked}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Interactive tools</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {isFreeTier
            ? "3 of 9 calculators unlocked. The rest unlock with Core."
            : "All calculators unlocked."}
        </p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {TOOLS.filter((t) => t.componentKey).map((t) => {
            const unlocked = isToolUnlocked(t.slug, access);
            return (
              <li key={t.slug}>
                <ToolCard
                  title={t.title}
                  description={t.description}
                  href={`/dashboard/tools/${t.slug}`}
                  unlocked={unlocked}
                  premiumOnly={t.premiumOnly}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {isFreeTier ? (
        <section className="mt-14 rounded-lg border-2 border-amber-600 bg-amber-50 p-7 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-800">
            Unlock everything
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            21 modules. 71 tools. $47, one time.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-700">
            Blueprint Core is the complete system. Lifetime access. No
            recurring charge. Premium adds a 60-minute call with Ryan.
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex items-center justify-center rounded-md bg-amber-700 px-5 py-3 text-sm font-medium text-white hover:bg-amber-800"
          >
            See pricing
          </Link>
        </section>
      ) : null}
    </main>
  );
}

function ModuleCard(props: {
  number: string;
  title: string;
  summary: string;
  toolCount: number;
  href: string;
  unlocked: boolean;
}) {
  const { number, title, summary, toolCount, href, unlocked } = props;
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Module {number}
        </p>
        {unlocked ? (
          <p className="text-xs text-neutral-500">
            {toolCount} tool{toolCount === 1 ? "" : "s"}
          </p>
        ) : (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
            Locked
          </span>
        )}
      </div>
      <h3
        className={
          "mt-1 text-lg font-semibold leading-snug " +
          (unlocked ? "text-neutral-900" : "text-neutral-500")
        }
      >
        {title}
      </h3>
      <p
        className={
          "mt-2 text-sm " + (unlocked ? "text-neutral-600" : "text-neutral-500")
        }
      >
        {summary}
      </p>
      {!unlocked ? (
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Unlock with Blueprint Core. $47
        </Link>
      ) : null}
    </>
  );

  if (unlocked) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-100/60 p-5">
      {inner}
    </div>
  );
}

function ToolCard(props: {
  title: string;
  description: string;
  href: string;
  unlocked: boolean;
  premiumOnly?: boolean;
}) {
  const { title, description, href, unlocked, premiumOnly } = props;
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={
            "text-base font-semibold " +
            (unlocked ? "text-neutral-900" : "text-neutral-500")
          }
        >
          {title}
        </h3>
        {!unlocked ? (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
            Locked
          </span>
        ) : premiumOnly ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Premium
          </span>
        ) : null}
      </div>
      <p
        className={
          "mt-1 text-sm " + (unlocked ? "text-neutral-600" : "text-neutral-500")
        }
      >
        {description}
      </p>
      {!unlocked ? (
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Unlock with Blueprint Core. $47
        </Link>
      ) : null}
    </>
  );

  if (unlocked) {
    return (
      <Link
        href={href}
        className="flex h-full flex-col rounded-lg border border-neutral-200 p-5 transition hover:border-amber-600 hover:shadow-sm"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-200 bg-neutral-100/60 p-5">
      {inner}
    </div>
  );
}
