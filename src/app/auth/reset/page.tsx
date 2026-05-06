import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { setPasswordAfterReset } from "./actions";

export const metadata = { title: "Set a new password" };

// /auth/reset is the landing page for Supabase password reset emails.
// Supabase's resetPasswordForEmail sends the user to /auth/reset with a code
// param; the proxy.ts middleware refreshes the session and the user becomes
// authenticated for this request. We then let them set a new password.
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Note: when the user clicks the reset link, Supabase auth flow leaves them
  // signed in (session exchanged via PKCE handler in /auth/callback or the
  // proxy). If they land here without a session, send them back to /forgot-password.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Reset link is missing or already used. Request a new one.")
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Pick a password you will remember. The same password works in the
        SeniorSafe app, so you only need one.
      </p>

      {error ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <form action={setPasswordAfterReset} className="mt-8 flex flex-col gap-4">
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
          Confirm password
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
          className="rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Save new password
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="underline hover:text-neutral-900">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
