import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { setOrChangePassword } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  const { ok, error } = await searchParams;

  // Detect whether the user already has a password identity. Supabase exposes
  // this via auth.users.identities — the "email" provider entry signals an
  // email/password identity exists. Users created via OTP-only or OAuth-only
  // do not have it until they set a password.
  const identities = (user.identities ?? []) as Array<{ provider?: string }>;
  const hasPassword = identities.some((i) => i.provider === "email");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Manage how you sign in. You can use Google, magic link, or a password.
      </p>

      <section className="mt-10 rounded-lg border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {hasPassword ? "Change your password" : "Set a password"}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          {hasPassword
            ? "Update the password on your account. You will stay signed in here."
            : "Add a password so you can log in without waiting on a magic link email."}
        </p>

        {ok ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Password updated.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <form action={setOrChangePassword} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            New password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-md border border-neutral-300 px-3 py-2 text-base"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Confirm new password
            <input
              type="password"
              name="confirm"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-md border border-neutral-300 px-3 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {hasPassword ? "Change password" : "Set password"}
          </button>
        </form>
      </section>
    </main>
  );
}
