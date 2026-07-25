import Link from "next/link";
import { SITE } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PublicFooter } from "@/components/PublicFooter";

// Free pivot (Jul 24 2026): this page used to sell Core ($47) and the
// Roadmap ($297). Both are free now. The URL stays because years of links
// point here; the page's new job is routing people to the right free door.
export const metadata = {
  title: "It's free now. All of it.",
  description:
    "The Senior Transition Blueprint and the Senior Transition Roadmap are free. The Blueprint takes an email. The Roadmap takes an application.",
};

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
            Pricing
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            It&apos;s free now. All of it.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600">
            We make our money helping families find the right agent when it is
            time to deal with the house, paid by the agent, never by you. So the
            education that protects your family costs nothing. The only question
            is how much of Ryan you want.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-lg border border-neutral-200 p-7">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Senior Transition Blueprint
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                The complete system you run yourself.
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold">Free</p>
              <p className="text-sm text-neutral-500">just an email</p>
            </div>
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                "All 20 modules. Lifetime access.",
                "All 69 tools and templates.",
                "Every interactive calculator and assessment.",
                "Self-paced. No deadlines. No card.",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-amber-700">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              {user ? (
                <Link
                  href="/dashboard"
                  className="block w-full rounded-md bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white"
                >
                  You have this. Open your dashboard.
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="block w-full rounded-md bg-neutral-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Create your free account
                </Link>
              )}
            </div>
          </article>

          <article className="flex flex-col gap-5 rounded-lg border-2 border-amber-600 bg-amber-50/40 p-7">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Senior Transition Roadmap
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                The guided version, built with Ryan{" "}
                <a
                  href={`${SITE.rssSite}/in-your-corner`}
                  className="font-medium text-neutral-900 underline underline-offset-2 hover:text-amber-700"
                >
                  in your corner
                </a>
                .
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-semibold">Free</p>
              <p className="text-sm text-neutral-500">by application</p>
            </div>
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                "Everything in the Blueprint.",
                "An intake form Ryan reviews personally. It asks for real detail, because the plan is real.",
                "Your intake call with Ryan.",
                "Your written Senior Transition Plan, built together.",
                "A follow-up call on how your family moves forward.",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-amber-700">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-neutral-500">
              Ryan Riggins is a Senior Transition Advisor and licensed NC broker
              with a fiduciary duty to families. He never takes the listing
              himself. Where professionals are needed, he brings them in, or
              works with the ones you already have.{" "}
              <a href={`${SITE.rssSite}/about`} className="font-medium text-neutral-900 underline">
                Meet Ryan
              </a>
            </p>
            <div className="mt-auto pt-2">
              <Link
                href="/roadmap/apply"
                className="block w-full rounded-md bg-amber-700 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-amber-800"
              >
                Start your application
              </Link>
            </div>
          </article>
        </section>

        <div className="border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
          <p>
            Why free? Because the honest answer to &ldquo;what does this
            cost&rdquo; is: nothing, unless the day comes to sell a house, and
            even then the agent pays us, not you.{" "}
            <a
              href={`${SITE.rssSite}/in-your-corner`}
              className="font-medium text-neutral-900 underline"
            >
              How that works
            </a>
          </p>
          <p className="mt-2">
            Questions? Email{" "}
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="font-medium text-neutral-900 underline"
            >
              {SITE.supportEmail}
            </a>
            {user ? (
              <>
                {" "}
                or head{" "}
                <Link href="/dashboard" className="text-neutral-900 underline">
                  back to your dashboard
                </Link>
                .
              </>
            ) : (
              <>
                .{" "}
                <Link href="/login" className="text-neutral-900 underline">
                  Already have an account? Log in.
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
