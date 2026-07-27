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
          No cost
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          The Senior Transition Blueprint
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          All 20 modules, all 69 tools, every calculator. No cost, no card, no
          password to remember. Fill this out and you are in.
        </p>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
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
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-neutral-700"
            >
              Phone <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Only if you want Ryan able to text you back. Never sold, never a
              robocall.
            </p>
          </div>

          <fieldset className="mt-2">
            <legend className="mb-2 block text-sm font-medium text-neutral-700">
              Where is your family right now?{" "}
              <span className="text-neutral-400">(optional)</span>
            </legend>
            <div className="flex flex-col gap-2">
              {[
                {
                  value: "crisis",
                  label:
                    "Something already happened. We are deciding in the next few weeks.",
                },
                {
                  value: "soon",
                  label: "Not urgent yet, but it is coming. Maybe this year.",
                },
                {
                  value: "planning",
                  label:
                    "Everyone is fine. I want to be ready before something breaks.",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-300 px-3 py-2 text-sm transition hover:border-amber-600 has-[:checked]:border-amber-700 has-[:checked]:bg-amber-50"
                >
                  <input
                    type="radio"
                    name="situation"
                    value={opt.value}
                    className="mt-1 accent-amber-700"
                  />
                  <span className="text-neutral-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              This just changes which module we point you at first. Skip it if
              you would rather look around yourself.
            </p>
          </fieldset>

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-amber-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
          >
            Open my Blueprint
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
