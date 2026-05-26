import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { verifyActivationToken } from "@/lib/activation-token";
import { activate } from "./actions";
import { signInWithGoogle } from "../login/actions";

export const metadata = { title: "Activate your free account" };

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; error?: string }>;
}) {
  // If already logged in, send them to the dashboard — no need to activate.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { token, email: emailParam, error } = await searchParams;

  const verified = verifyActivationToken(token);
  if (!verified.ok) {
    return <ExpiredOrInvalidView reason={verified.reason} />;
  }

  // Defense-in-depth: if the URL email param doesn't match the token's email,
  // someone tampered with the link. Reject.
  if (
    emailParam &&
    emailParam.toLowerCase().trim() !== verified.payload.email.toLowerCase()
  ) {
    return <ExpiredOrInvalidView reason="bad_payload" />;
  }

  const { email, firstName, lastName } = verified.payload;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
        Almost there
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Activate your free account
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        Unlock Module 00, your three free tools, and your 14-day SeniorSafe
        app trial. Use the same login on iPhone and Android.
      </p>

      {error ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {/* PRIMARY PATH: Google OAuth. Added 2026-05-26 because the
          existing google-oauth signups showed 100% activation versus 23%
          on the password-required path. Cross-subdomain OAuth state is
          handled by /auth/callback which runs applyFreeTierSetup for
          first-time users. Uses the email from the activation token
          implicitly when Google returns it. */}
      <form action={signInWithGoogle} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          <GoogleLogo />
          Continue with Google
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-neutral-500">
        Fastest. One tap. No password to remember.
      </p>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          or set a password
        </span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={activate} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token ?? ""} />

        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            value={email}
            readOnly
            className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-base text-neutral-700"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            First name
            <input
              type="text"
              name="firstName"
              defaultValue={firstName ?? ""}
              required
              minLength={1}
              maxLength={100}
              autoComplete="given-name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Last name{" "}
            <span className="text-xs font-normal text-neutral-500">
              (optional)
            </span>
            <input
              type="text"
              name="lastName"
              defaultValue={lastName ?? ""}
              maxLength={100}
              autoComplete="family-name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-base"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Create a password
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
          className="rounded-md bg-amber-700 px-4 py-3 text-sm font-medium text-white hover:bg-amber-800"
        >
          Activate and log in
        </button>
      </form>

      <p className="mt-6 text-xs text-neutral-500">
        Already activated?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Log in here
        </Link>
        .
      </p>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.07l3.01-2.32z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function ExpiredOrInvalidView({ reason }: { reason: string }) {
  const isExpired = reason === "expired";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isExpired ? "This activation link expired" : "This activation link is not valid"}
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        {isExpired
          ? "Activation links expire after 7 days. Submit your email again and we will send a fresh link."
          : "The link in your email is missing or has been altered. The fastest fix is to submit your email again on the free guide form."}
      </p>
      <Link
        href="https://rigginsstrategicsolutions.com/freeguide"
        className="mt-6 inline-flex justify-center rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Get a fresh link
      </Link>
      <p className="mt-3 text-xs text-neutral-500">
        Or{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          log in
        </Link>{" "}
        if you have already activated.
      </p>
    </main>
  );
}
