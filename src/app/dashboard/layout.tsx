import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { signOut } from "./actions";
import { SITE } from "@/lib/site";

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

  // Confirm the user has at least Blueprint Core access on their profile.
  const { data: profile } = await supabase
    .from("user_profile")
    .select("course_access, first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const access = (profile?.course_access ?? {}) as Record<string, unknown>;
  const hasCore = Boolean(access.blueprint_core);
  const hasPremium = Boolean(access.blueprint_premium);

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
          <button
            type="submit"
            className="text-sm text-neutral-500 underline"
          >
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
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
