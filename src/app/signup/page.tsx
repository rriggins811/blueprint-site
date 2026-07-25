import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { signupFree } from "./actions";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = {
  title: "Create your free account",
  description:
    "The Senior Transition Blueprint is free. All 20 modules and 69 tools, no payment, no card. Create your account and start.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const error = params.error;
  const email = params.email ?? "";

  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
          Free account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          The Blueprint is free. All of it.
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          All 20 modules, all 69 tools, every calculator, lifetime access. No
          payment and no card. Your email is how we save your progress and stay
          in your corner.
        </p>

        {error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <form action={signupFree} className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                autoComplete="given-name"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="mb-1 block text-sm font-medium text-neutral-700"
              >
                Last name <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={email}
              autoComplete="email"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-amber-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
          >
            Create my free account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-neutral-900 underline">
            Log in
          </Link>
        </p>
        <p className="mt-4 text-center text-xs leading-relaxed text-neutral-400">
          Want the guided version? The Senior Transition Roadmap is free too.{" "}
          <Link href="/roadmap" className="underline">
            It starts with an application.
          </Link>
        </p>
      </main>
      <PublicFooter />
    </>
  );
}
