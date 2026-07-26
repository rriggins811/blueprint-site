import Link from "next/link";
import { submitRoadmapApplication } from "./actions";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = {
  title: "Apply for your free Senior Transition Roadmap",
  description:
    "The Roadmap is free. It starts with this application, then an intake call with Ryan. Built together, not downloaded.",
};

const inputCls =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";
const labelCls = "mb-1 block text-sm font-medium text-neutral-700";

export default async function RoadmapApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-amber-700">
          Free, by application
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Apply for your Senior Transition Roadmap.
        </h1>
        <p className="mt-4 text-neutral-600">
          The Roadmap is free, but it is built together, not downloaded. Here is
          how it works: you fill out this application, then book your intake
          call with Ryan on the next page. Ryan reviews your answers before the
          call. After the call, we build your written plan, and a follow-up
          call walks through how your family moves forward. Where professionals
          are needed, Ryan brings them in, or works with the ones you already
          have.
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Your answers stay between you and Ryan. They are never sold or shared.
          Every question is required unless it says optional.
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

        <form action={submitRoadmapApplication} className="mt-10 flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelCls}>
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                required
                autoComplete="given-name"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelCls}>
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                required
                autoComplete="family-name"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelCls}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}>
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="relationship" className={labelCls}>
                Who is this transition for?
              </label>
              <select id="relationship" name="relationship" required className={inputCls}>
                <option value="myself">Myself</option>
                <option value="parent">My parent</option>
                <option value="spouse">My spouse</option>
                <option value="other-family">Another family member</option>
                <option value="other">Someone else</option>
              </select>
            </div>
            <div>
              <label htmlFor="state" className={labelCls}>
                What state is the home in?
              </label>
              <input
                id="state"
                name="state"
                required
                autoComplete="address-level1"
                className={inputCls}
                placeholder="North Carolina"
              />
            </div>
            <div>
              <label htmlFor="homeSituation" className={labelCls}>
                The home today
              </label>
              <select id="homeSituation" name="homeSituation" required className={inputCls}>
                <option value="own-free-and-clear">Owned free and clear</option>
                <option value="own-with-mortgage">Owned, still has a mortgage</option>
                <option value="renting">Renting</option>
                <option value="already-listed">Already listed for sale</option>
                <option value="not-sure">Not sure</option>
              </select>
            </div>
            <div>
              <label htmlFor="timeline" className={labelCls}>
                Your timeline
              </label>
              <select id="timeline" name="timeline" required className={inputCls}>
                <option value="now">We need to move on this now</option>
                <option value="3-6-months">3 to 6 months</option>
                <option value="6-12-months">6 to 12 months</option>
                <option value="exploring">Still exploring</option>
              </select>
            </div>
            <div>
              <label htmlFor="pressure" className={labelCls}>
                Has anyone pushed a cash offer, contract, or fast sale on you?{" "}
                <span className="text-neutral-400">(optional)</span>
              </label>
              <select id="pressure" name="pressure" className={inputCls} defaultValue="">
                <option value="">Select one</option>
                <option value="no">No</option>
                <option value="letters-calls">A few letters or calls</option>
                <option value="actively-pushing">Yes, someone is actively pushing</option>
                <option value="signed-or-about-to">Yes, something is signed or about to be</option>
              </select>
            </div>
            <div>
              <label htmlFor="seniorWillingness" className={labelCls}>
                How does the senior feel about a change?{" "}
                <span className="text-neutral-400">(optional)</span>
              </label>
              <select id="seniorWillingness" name="seniorWillingness" className={inputCls} defaultValue="">
                <option value="">Select one</option>
                <option value="willing">Willing</option>
                <option value="reluctant">Reluctant</option>
                <option value="resistant">Resistant</option>
                <option value="this-is-for-me">This transition is for me</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="biggestConcern" className={labelCls}>
              What is the biggest concern right now?
            </label>
            <textarea
              id="biggestConcern"
              name="biggestConcern"
              required
              rows={4}
              className={inputCls}
              placeholder="The house, the money, the care decision, the family dynamics. Whatever is heaviest."
            />
          </div>

          <fieldset>
            <legend className={labelCls}>
              Professionals already in your corner (check all that apply)
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                ["attorney", "Elder law or estate attorney"],
                ["financial-advisor", "Financial advisor"],
                ["tax-professional", "Tax professional"],
                ["real-estate-agent", "Real estate agent"],
                ["care-manager", "Care manager or placement advisor"],
                ["none", "None yet"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
                >
                  <input type="checkbox" name="professionals" value={value} />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Ryan brings in the professionals that are needed, or works with
              the ones you already have. Nobody gets replaced.
            </p>
          </fieldset>

          <div>
            <label htmlFor="notes" className={labelCls}>
              Anything else Ryan should know before the call?{" "}
              <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea id="notes" name="notes" rows={3} className={inputCls} />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-amber-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-800"
          >
            Submit application and book my intake call
          </button>
          <p className="text-center text-xs text-neutral-500">
            Education and coordination, not legal, tax, or investment advice.{" "}
            <Link href="/roadmap" className="underline">
              Back to the Roadmap overview
            </Link>
          </p>
        </form>
      </main>
      <PublicFooter />
    </>
  );
}
