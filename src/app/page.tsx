import Link from "next/link";
import { PRICING, SITE } from "@/lib/site";
import { PublicFooter } from "@/components/PublicFooter";

export default function HomePage() {
  return (
    <>
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
          Riggins Strategic Solutions
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          The Senior Transition Blueprint
        </h1>
        <p className="text-lg text-neutral-600">
          Twenty modules that walk your family through the move from the
          family home to senior living. Built on years on the buying side of
          real estate, across dozens of properties. Your parent. Your timeline.
          No surprises. And as of this year, free.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{PRICING.core.label}</h2>
            <p className="text-2xl font-semibold">Free</p>
          </div>
          <ul className="flex-1 space-y-1 text-sm text-neutral-700">
            <li>All 20 modules. Lifetime access.</li>
            <li>Every interactive tool and printable template.</li>
            <li>Self-paced. Just an email, no card.</li>
          </ul>
          <Link
            href="/signup"
            className="block w-full rounded-md bg-neutral-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Create your free account
          </Link>
        </article>

        <article className="flex flex-col gap-4 rounded-lg border-2 border-amber-600 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{PRICING.premium.label}</h2>
            <p className="text-2xl font-semibold">Free</p>
          </div>
          <ul className="flex-1 space-y-1 text-sm text-neutral-700">
            <li>Everything in the Blueprint, plus Ryan.</li>
            <li>An intake form and call Ryan reviews personally.</li>
            <li>Your written plan, built together, and a follow-up call.</li>
          </ul>
          <p className="text-xs leading-relaxed text-neutral-500">
            Ryan Riggins is a Senior Transition Advisor and licensed NC broker
            with a fiduciary duty to families. He never takes the listing
            himself.{" "}
            <a
              href={`${SITE.rssSite}/about`}
              className="font-medium text-neutral-900 underline"
            >
              Meet Ryan
            </a>{" "}
            Where professionals are needed, he brings them in, or works with
            the ones you already have.
          </p>
          <Link
            href="/roadmap/apply"
            className="block w-full rounded-md bg-amber-700 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-amber-800"
          >
            Apply for the free Roadmap
          </Link>
        </article>
      </section>

      <div className="border-t border-neutral-200 pt-6 text-sm text-neutral-500">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-neutral-900 underline">
            Log in to your dashboard
          </Link>
          .
        </p>
        <p className="mt-2">
          Questions? Email{" "}
          <a
            href={`mailto:${SITE.supportEmail}`}
            className="font-medium text-neutral-900 underline"
          >
            {SITE.supportEmail}
          </a>
          .
        </p>
      </div>
    </main>
    <PublicFooter />
    </>
  );
}
