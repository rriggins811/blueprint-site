import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MODULES } from "@/lib/blueprint-modules";

export const metadata = { title: "Your Blueprint" };

export default async function DashboardHome() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already redirects unauthenticated users, but page renders in parallel.
  // Guard against the brief null window so we don't throw during the redirect.
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profile")
    .select("course_access, first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const access = (profile?.course_access ?? {}) as Record<string, unknown>;
  const hasPremium = Boolean(access.blueprint_premium);
  const firstName = profile?.first_name ?? null;

  const visibleModules = MODULES.filter(
    (m) => !m.premiumOnly || hasPremium
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mt-2 text-neutral-600">
          Start at Module 00. Or jump to wherever your family is right now.
          Self-paced. Lifetime access.
        </p>
      </header>

      <ol className="grid gap-3 md:grid-cols-2">
        {visibleModules.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/dashboard/${m.slug}`}
              className="block rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                  Module {m.number}
                </p>
                <p className="text-xs text-neutral-500">
                  {m.toolCount} tool{m.toolCount === 1 ? "" : "s"}
                </p>
              </div>
              <h2 className="mt-1 text-lg font-semibold leading-snug">
                {m.title}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">{m.summary}</p>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
