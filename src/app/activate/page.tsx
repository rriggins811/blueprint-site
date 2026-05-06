import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { verifyActivationToken } from "@/lib/activation-token";
import { activate } from "./actions";

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
        Set a password to unlock Module 00, your three free tools, and your
        14-day SeniorSafe app trial. Same password works in the SeniorSafe app
        on iPhone and Android.
      </p>

      {error ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <form action={activate} className="mt-8 flex flex-col gap-4">
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
            Last name
            <input
              type="text"
              name="lastName"
              defaultValue={lastName ?? ""}
              required
              minLength={1}
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
