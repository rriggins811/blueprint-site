import Link from "next/link";
import { PRICING, SITE } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseCourseAccess, isPaid } from "@/lib/access";

export const metadata = {
  title: "Pricing",
  description:
    "Two ways into the full Blueprint. Core for the self-serve family. Premium for the family that wants Ryan in their corner.",
};

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyPaid = false;
  let alreadyPremium = false;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profile")
      .select("course_access")
      .eq("user_id", user.id)
      .maybeSingle();
    const access = parseCourseAccess(profile?.course_access);
    alreadyPaid = isPaid(access);
    alreadyPremium = access.tier === "premium";
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
          Pricing
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Two ways into the full Blueprint.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-neutral-600">
          Same 21 modules. Same 71 tools. Same lifetime access. The only
          question is whether you want Ryan in the room with you for an hour.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <PlanCard
          tier="core"
          title={PRICING.core.label}
          price={PRICING.core.priceUsd}
          tagline="The complete system you can run yourself."
          bullets={[
            "All 21 modules. Lifetime access.",
            "All 71 tools and templates.",
            "Every interactive calculator and assessment.",
            "Self-paced. No deadlines.",
          ]}
          alreadyOwned={alreadyPaid}
          loggedIn={Boolean(user)}
        />
        <PlanCard
          tier="premium"
          title={PRICING.premium.label}
          price={PRICING.premium.priceUsd}
          tagline="The complete system plus Ryan in your corner."
          bullets={[
            "Everything in Core.",
            "Personalized transition plan tailored to your situation.",
            "One 60-minute strategy call with Ryan.",
            "90 days of priority email support.",
            "Premium intake doc to prep your call.",
          ]}
          highlighted
          alreadyOwned={alreadyPremium}
          loggedIn={Boolean(user)}
        />
      </section>

      <footer className="border-t border-neutral-200 pt-8 text-center text-sm text-neutral-500">
        <p>
          Questions? Email{" "}
          <a
            href={`mailto:${SITE.supportEmail}`}
            className="font-medium text-neutral-900 underline"
          >
            {SITE.supportEmail}
          </a>
          .
        </p>
        {user ? (
          <p className="mt-2">
            <Link
              href="/dashboard"
              className="text-neutral-900 underline"
            >
              Back to dashboard
            </Link>
          </p>
        ) : (
          <p className="mt-2">
            <Link href="/login" className="text-neutral-900 underline">
              Already purchased? Log in.
            </Link>
          </p>
        )}
      </footer>
    </main>
  );
}

function PlanCard({
  tier,
  title,
  price,
  tagline,
  bullets,
  highlighted,
  alreadyOwned,
  loggedIn,
}: {
  tier: "core" | "premium";
  title: string;
  price: number;
  tagline: string;
  bullets: string[];
  highlighted?: boolean;
  alreadyOwned: boolean;
  loggedIn: boolean;
}) {
  return (
    <article
      className={
        "flex flex-col gap-5 rounded-lg p-7 " +
        (highlighted ? "border-2 border-amber-600 bg-amber-50/40" : "border border-neutral-200")
      }
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{tagline}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-semibold">${price}</p>
        <p className="text-sm text-neutral-500">one-time</p>
      </div>
      <ul className="space-y-2 text-sm text-neutral-700">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-amber-700">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        {alreadyOwned ? (
          <Link
            href="/dashboard"
            className="block w-full rounded-md bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white"
          >
            You already have this. Open your dashboard.
          </Link>
        ) : (
          <form action="/api/checkout" method="POST">
            <input type="hidden" name="tier" value={tier} />
            <button
              type="submit"
              className={
                "w-full rounded-md px-4 py-3 text-sm font-medium text-white transition " +
                (highlighted
                  ? "bg-amber-700 hover:bg-amber-800"
                  : "bg-neutral-900 hover:bg-neutral-800")
              }
            >
              {loggedIn ? "Upgrade" : "Get"} {title}
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
