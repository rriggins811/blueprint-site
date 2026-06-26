import Link from "next/link";
import Image from "next/image";
import { Fraunces } from "next/font/google";
import { SITE } from "@/lib/site";

// Warm display serif for the headlines, mirroring the premium care-roadmap feel.
const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const display = serif.className;

export const metadata = {
  title: "Your Senior Transition Roadmap",
  description:
    "The whole path of a senior transition, laid out before you. Blueprint Premium walks your map with you, start to finish, with Ryan as quarterback and a vetted team around your family.",
};

// --- Data -------------------------------------------------------------------

type Phase = {
  num: string;
  title: string;
  range: string;
  tagline: string;
  anchor?: boolean;
  blurb: string;
  covers: { label: string; slug: string }[];
  tools: string[];
};

const PHASES: Phase[] = [
  {
    num: "1",
    title: "Get Your Bearings",
    range: "Modules 00 to 04",
    tagline: "Clarity first",
    blurb:
      "Before anything moves, we get your family on the same page and take an honest look at where you actually stand. Then we start clearing the house: the sorting, the paperwork, and the tough sentimental decisions that stop most families cold.",
    covers: [
      { label: "Foundations and Quick Start", slug: "module-00" },
      { label: "Starting Point Assessment", slug: "module-01" },
      { label: "Sorting and Decluttering", slug: "module-02" },
      { label: "Paperwork System", slug: "module-03" },
      { label: "Sentimental Items and Decisions", slug: "module-04" },
    ],
    tools: [
      "Starting Point Assessment",
      "Transition Stage Readiness",
      "5-Pile Sorting System",
      "3-Folder Paperwork System",
    ],
  },
  {
    num: "2",
    title: "The Home and the Money",
    range: "Modules 05 to 09",
    tagline: "Where the dollars are won or lost",
    anchor: true,
    blurb:
      "What the home is really worth, the repairs that actually pay you back versus the ones that just drain the account, every way to sell, and how to spot the cash buyers and wholesalers circling. Plus the legal and financial footing, so the home decision lines up with the rest of the plan instead of blowing it up. This is the lane Ryan carries personally.",
    covers: [
      { label: "Property Prep and Repairs", slug: "module-05" },
      { label: "Legal and Financial Foundation", slug: "module-06" },
      { label: "Touring and Comparing Facilities", slug: "module-07" },
      { label: "Asset and Estate Inventory", slug: "module-08" },
      { label: "Sale Decision Path", slug: "module-09" },
    ],
    tools: [
      "Smart Prep Budget",
      "Repair Priority",
      "Transition Cost Estimator",
      "Net Proceeds Calculator",
      "Cash Offer Evaluation",
      "Decision Pyramid",
    ],
  },
  {
    num: "3",
    title: "Make the Move",
    range: "Modules 10 to 12",
    tagline: "The hand-off nobody warns you about",
    blurb:
      "The logistics nobody warns you about. The move timeline, closing day, and the first 72 hours after, which is when most things go sideways if no one is watching.",
    covers: [
      { label: "Move Logistics", slug: "module-10" },
      { label: "Closing Day", slug: "module-11" },
      { label: "First 72 Hours After Move", slug: "module-12" },
    ],
    tools: [
      "Move Timeline",
      "Closing Day Checklist",
      "First 72 Hours Playbook",
      "Daily Check-In",
    ],
  },
  {
    num: "4",
    title: "The Long Game",
    range: "Modules 13 to 18",
    tagline: "Your team steps in",
    blurb:
      "Keeping the family standing and the plan funded for the long haul. Family dynamics, aging in place versus moving, long-term care, government benefits, estate planning, and watching for caregiver burnout. This is where your team plugs in. Care goes to Callahan Care Solutions, and for legal, financial, and the rest, we find and vet the local and state professionals you need for your situation.",
    covers: [
      { label: "Family Dynamics", slug: "module-13" },
      { label: "Aging in Place vs Move", slug: "module-14" },
      { label: "Long-Term Care Planning", slug: "module-15" },
      { label: "Government Benefits", slug: "module-16" },
      { label: "Estate Planning", slug: "module-17" },
      { label: "Caregiver Self-Care", slug: "module-18" },
    ],
    tools: [
      "Family Meeting Agenda",
      "Aging Cost Calculator",
      "LTC Decision",
      "Medicaid Spend-Down",
      "Trust Selection",
      "Burnout Assessment",
    ],
  },
  {
    num: "5",
    title: "Cross the Finish Line",
    range: "Module 19",
    tagline: "Wrap it up and breathe",
    blurb:
      "Wrap it up, take a breath, and look at what is next. A check-back to make sure the plan held, and a soft landing into SeniorSafe for the day to day once the transition is done.",
    covers: [{ label: "Completion", slug: "module-19" }],
    tools: ["Completion Assessment"],
  },
];

const FEELINGS = [
  ["The all-at-once", "The house, the money, the paperwork, and the care all land in the same hard week."],
  ["The guilt", "Wondering whether you are doing enough, or doing right by your parent."],
  ["Fear of the wrong call", "Big decisions with real money on them, and no map to follow."],
  ["Family friction", "Siblings and spouses who do not all see it the same way."],
  ["Caregiver exhaustion", "Running on empty while trying to hold everyone else up."],
  ["Decision paralysis", "Every path feels uncertain, so the easy, costly choice wins."],
] as const;

type TeamRole = { role: string; name?: string; href?: string };

const TEAM: TeamRole[] = [
  { role: "Care", name: "Callahan Care Solutions", href: "https://callahancaresolutions.com" },
  { role: "Elder-Law Attorney" },
  { role: "Financial Advisor" },
  { role: "CPA / Tax" },
  { role: "Placement Specialist" },
  { role: "Home Health" },
  { role: "Reverse Mortgage / HECM" },
  { role: "Vetted Local Real Estate Agent" },
];

const VETTED_LINE =
  "We find and vet the local and state professionals you need for your situation.";

const CASES = [
  {
    family: "The Smith Family",
    stat: "About $96,000 more",
    statSub: "than the cash offer would have handed them",
    situation:
      "I will be straight with you. I was the cash buyer on this one. Mrs. Smith was 90 with early dementia, already living two hours away with her son and his wife. Her 1970s ranch sat mostly empty except for a nephew living there rent free, while a home equity line quietly bled the family about $1,100 a month at 13 percent. They just wanted it gone, so I bought it cheap. Here is how I would walk that same family through it today, and what it would have put back in their pocket.",
    phases: [
      "First we get the family on the same page and look at the whole picture honestly. Mrs. Smith was safe with her son, but the house was the problem nobody wanted to touch: a nephew living there rent free, the equity line bleeding every month, and the place full to the ceiling. The first job is not the house, it is clarity. Stop the bleeding, get the house sold the right way, and free up money for Mrs. Smith's care as the dementia gets worse.",
      "Here is where the real money lived, and where most families get taken. The cash offer on that house was $105,000. Pay off the $32,000 still owed on the equity line and the family walks with about $73,000. Fast and clean, and it leaves a fortune on the table. The better path is simple: about $8,000 of the right work, pull the ruined carpet, refinish the hardwoods underneath, fresh paint, reglaze the dated tubs. Nothing fancy, just the work that pays back. In that market the house sells around $225,000. After the equity line, the repairs, and roughly 7 percent in selling costs, the family nets about $169,000. That is close to $96,000 more than the cash offer, for about eight grand and a few weeks of work.",
      "Mrs. Smith had already moved in with her son, so the move here was the house, not the person. We clear it out with respect, which on this one meant two full loads of her keepsakes driven the two hours to the son's home so nothing that mattered got lost. Then the light rehab, about four weeks, then list. Start to finish, roughly 90 days to a closing.",
      "This is where the team comes in, and where the house money turns into a real plan. I bring in Ryan Callahan at Callahan Care Solutions to build Mrs. Smith a life care plan: review her Medicaid and financial options, plan for a spend-down if it ever comes to that, and stretch her money as far as it will go as the dementia progresses. Just as important, Callahan coaches the son and his wife on the caregiving itself, and respite so they do not burn out. If the family needs more, I find and vet the local pieces: a financial advisor, a CPA, an elder-law attorney, and a memory care option if it is ever needed.",
      "The house sells for what it is actually worth. The family clears close to $96,000 more than the cash offer would have handed them. Mrs. Smith stays cared for, with a real plan and real money behind it, and her son and his wife have a team instead of a weight on their shoulders.",
    ],
    outcome:
      "Cash offer: about $73,000, gone in a week. The guided path: about $169,000 and a funded plan for Mrs. Smith's care. Same house, nearly $96,000 more.",
  },
  {
    family: "The Jones Family",
    stat: "From $4,000 out to about $100,000",
    statSub: "the same inherited land, handled right",
    situation:
      "Another one where I was on the other side of the table. Ms. Jones, in her sixties, inherited a house on three acres in a quiet, desirable spot just off the main road. She never asked for it, and she was still making a mortgage payment she could not afford. She wanted out so badly that at closing she brought a check just to make the deal work, and walked away with nothing. She had her own agent, and I was the cash buyer, so I never got to tell her what I am about to tell you.",
    phases: [
      "She was drowning. An inherited property, a mortgage she did not sign up for, and no clear picture of what she actually had. The first job is to slow it down and look at the whole thing honestly, because the worst decisions in this business get made by people who just want the pain to stop. And what she had was not a tired old house. It was land, a lot more of it than anyone was treating it as.",
      "The house was a distraction. The value was in the dirt. First, sell the one lot that was already split off and ready, for about $40,000, to get cash in her hands and stop the bleeding. Use part of that to fund the real work: clear the brush off the three acres behind, bring in county surveyors to split it into three large lots, build a simple gravel road back with an easement, and bulldoze the tired house for about $10,000. When the dust settles, that is three back lots at about $65,000 each, plus two more around $40,000 each. Take out the mortgage and the costs, and she nets somewhere around $100,000. She paid $4,000 to walk away from land that, handled right, would have put roughly a hundred grand in her pocket.",
      "The order matters as much as the plan. We sell that one ready lot up front so she gets relief in weeks, not months, and so the project funds itself instead of costing her more she does not have. Then the survey and county approvals, the clearing, the road, and the lots come to market in the right sequence. I quarterback the moving parts and the closings so she is not chasing surveyors and builders on her own.",
      "She is a senior herself, and a six-figure swing changes her whole next chapter, so we plan it instead of letting it slip away. I bring in Ryan Callahan to help her think through her own aging and care plan, and I find and vet the rest of her team: a financial advisor and a CPA so a windfall like this does not turn into a tax surprise, and an estate attorney to set up her own affairs now that she finally has something to protect.",
      "She goes from writing a check just to escape, to roughly $100,000 in the bank and a real plan for the years ahead, with people in her corner. The land never changed. The only thing that changed was having someone on her side who knew what it was worth.",
    ],
    outcome:
      "She paid $4,000 to walk away with nothing. The same land, handled right, was worth about $100,000 to her, plus a plan for her own next chapter.",
  },
] as const;

const PHASE_TITLES = [
  "Get Your Bearings",
  "The Home and the Money",
  "Make the Move",
  "The Long Game",
  "Cross the Finish Line",
];

// --- Page -------------------------------------------------------------------

export default function RoadmapPage() {
  return (
    <main className="w-full bg-cream text-ink">
      {/* HERO */}
      <section className="border-b border-cream-200 bg-cream">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-mark.png" alt="Riggins Strategic Solutions" width={40} height={40} className="h-9 w-9" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
              Riggins Strategic Solutions
            </span>
          </div>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em] text-navy/60">
            A private guide for your family
          </p>
          <h1 className={`${display} mt-3 text-4xl leading-[1.08] text-navy sm:text-5xl lg:text-6xl`}>
            <span className="italic text-gold-700">The Whole Path,</span>
            <br />
            Laid Out Before You
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">
            When a parent needs to move, it hits all at once. The house, the money, the paperwork, the
            care, the family, and a hundred decisions you have never had to make before, usually in the
            middle of a hard week. Most families face it one painful step at a time. This is the map we
            walk together, start to finish, so you can see the whole thing before you decide anything.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["One clear plan", "The whole transition on one page, in order."],
              ["Ryan as quarterback", "Deepest where the dollars are: the home and the money."],
              ["A vetted team", "The right specialist for every part outside Ryan's lane."],
            ].map(([h, s]) => (
              <div key={h} className="rounded-lg border-l-4 border-gold bg-white/70 px-5 py-4">
                <p className="font-semibold text-navy">{h}</p>
                <p className="mt-1 text-sm text-ink/70">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEELINGS LAYER */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className={`${display} text-2xl text-navy sm:text-3xl`}>What families carry</h2>
          <p className="mt-2 text-ink/70">If you recognize yourself here, you are not behind, and you are not alone.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEELINGS.map(([h, s]) => (
              <div key={h} className="rounded-lg border border-cream-200 bg-cream/60 p-5">
                <p className="font-semibold text-navy">{h}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{s}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-lg border-l-4 border-burgundy bg-burgundy/5 px-6 py-4">
            <p className="text-ink/90">
              This is exactly the weight the roadmap is built to carry. We bring order, calm, and a clear
              next step to all of it.
            </p>
          </div>
        </div>
      </section>

      {/* ROADMAP AT A GLANCE */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <h2 className={`${display} text-3xl sm:text-4xl`}>Your roadmap at a glance</h2>
          <p className="mt-2 text-cream/70">Five connected phases, guided, organized, and built around your family.</p>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {PHASES.map((p) => (
              <li key={p.num} className="relative flex flex-col items-start">
                <div className={`${display} flex h-12 w-12 items-center justify-center rounded-full bg-gold text-xl font-bold text-navy`}>
                  {p.num}
                </div>
                <p className="mt-4 font-semibold leading-snug text-cream">{p.title}</p>
                <p className="mt-1 text-sm italic text-gold">{p.tagline}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PER-PHASE DETAIL */}
      <section className="bg-cream">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="space-y-8">
            {PHASES.map((p) => (
              <article
                key={p.num}
                className={
                  "relative overflow-hidden rounded-xl border bg-white p-7 lg:p-9 " +
                  (p.anchor ? "border-gold shadow-sm" : "border-cream-200")
                }
              >
                <span className={`${display} pointer-events-none absolute right-5 top-2 select-none text-7xl font-bold text-cream-200`}>
                  {p.num.padStart(2, "0")}
                </span>
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-700">
                      Phase {p.num} of 5 · {p.range}
                    </span>
                    {p.anchor ? (
                      <span className="rounded-full bg-burgundy/10 px-2.5 py-0.5 text-xs font-semibold text-burgundy">
                        Ryan goes deepest here
                      </span>
                    ) : null}
                  </div>
                  <h3 className={`${display} mt-2 text-2xl text-navy sm:text-3xl`}>{p.title}</h3>
                  <p className="mt-1 text-sm italic text-ink/60">{p.tagline}</p>
                  <p className="mt-4 max-w-3xl leading-relaxed text-ink/80">{p.blurb}</p>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy/60">What this covers</p>
                      <ul className="mt-2 space-y-1.5">
                        {p.covers.map((m) => (
                          <li key={m.slug}>
                            <Link href={`/dashboard/${m.slug}`} className="text-sm text-navy underline decoration-cream-200 underline-offset-2 hover:decoration-gold">
                              {m.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-navy/60">Key tools</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.tools.map((t) => (
                          <span key={t} className="rounded-full bg-cream px-3 py-1 text-xs text-ink/75">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM HUB */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className={`${display} text-3xl text-navy sm:text-4xl`}>Your senior transition team</h2>
          <p className="mt-2 max-w-2xl text-ink/70">
            One quarterback who knows the whole field, and the right specialist for every part outside his lane.
          </p>

          <div className="mt-10 rounded-xl border-2 border-navy bg-navy px-7 py-8 text-center text-cream">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Your quarterback</p>
            <p className={`${display} mt-2 text-2xl`}>Ryan Riggins · Riggins Strategic Solutions</p>
            <p className="mx-auto mt-2 max-w-2xl text-cream/80">
              Ryan runs the whole transition with you, start to finish, and goes deepest on the home and the
              money, where the biggest dollars are won or lost. Around him, the family and each specialist role.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((t) => (
              <div key={t.role} className="flex h-full flex-col rounded-lg border border-cream-200 bg-cream/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{t.role}</p>
                {t.name ? (
                  <>
                    <p className="mt-1 font-semibold text-navy">{t.name}</p>
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-burgundy underline underline-offset-2"
                    >
                      callahancaresolutions.com
                    </a>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">{VETTED_LINE}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASE STUDIES */}
      <section className="bg-cream">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className={`${display} text-3xl text-navy sm:text-4xl`}>A real family, start to finish</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink/80">
            Two real deals from my years on the buying side of real estate. I was the cash buyer on both, so I
            never got to tell these families what I am about to show you. Names, addresses, and exact figures
            are changed. The money left on the table, and the path I walk families through now, are real.
          </p>

          <div className="mt-10 space-y-10">
            {CASES.map((c) => (
              <article key={c.family} className="overflow-hidden rounded-xl border border-cream-200 bg-white">
                <div className="grid gap-6 border-b border-cream-200 bg-navy/[0.03] p-7 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <h3 className={`${display} text-2xl text-navy`}>{c.family}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/75">{c.situation}</p>
                  </div>
                  <div className="rounded-lg bg-navy px-6 py-4 text-center text-cream sm:min-w-44">
                    <p className={`${display} text-2xl text-gold`}>{c.stat}</p>
                    <p className="mt-1 text-xs text-cream/70">{c.statSub}</p>
                  </div>
                </div>
                <div className="p-7">
                  <ol className="space-y-5">
                    {c.phases.map((body, i) => (
                      <li key={i} className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-5">
                        <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                          <span className={`${display} flex h-8 w-8 items-center justify-center rounded-full bg-cream text-sm font-bold text-navy`}>
                            {i + 1}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-gold-700 sm:mt-1">
                            {PHASE_TITLES[i]}
                          </span>
                        </div>
                        <p className="leading-relaxed text-ink/80">{body}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-6 rounded-lg border-l-4 border-gold bg-cream/60 px-6 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">The bottom line</p>
                    <p className="mt-1 font-medium text-navy">{c.outcome}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PREMIUM OFFER + CONSULT + CTA */}
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <h2 className={`${display} text-3xl sm:text-4xl`}>Walk your map with Ryan</h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-cream/85">
            Blueprint Premium is the guided version. You do not just get the course and the 70-plus tools. You
            get Ryan walking your whole map with you, from getting your bearings to crossing the finish line.
            Together we build your written Senior Transition Plan, go deep on the home and the money where the
            biggest dollars are won or lost, and line up the vetted team for the parts outside Ryan's lane.
            Ninety days of email support so you are never stuck wondering what comes next.
          </p>

          <div className="mt-10 rounded-xl border border-cream/15 bg-white/[0.04] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">The 60-minute call walks your whole map</p>
            <ol className="mt-4 space-y-2 text-cream/85">
              <li>1. Where your family stands and what you need most. <span className="text-cream/55">(Phase 1)</span></li>
              <li>2. The home and the money, the heaviest lift, your real options and what protects the most. <span className="text-cream/55">(Phase 2)</span></li>
              <li>3. The move and the long game, what is coming and who handles each piece. <span className="text-cream/55">(Phases 3 and 4)</span></li>
              <li>4. Your team and your first 90 days. <span className="text-cream/55">(Phases 4 and 5)</span></li>
            </ol>
            <p className="mt-4 text-cream/85">
              You leave with a written <strong className="font-semibold text-cream">Senior Transition Plan</strong>, your personal version of this
              map, filled in for your family's situation.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <form action="/api/checkout" method="POST">
              <input type="hidden" name="tier" value="premium" />
              <button
                type="submit"
                className="rounded-md bg-gold px-7 py-3.5 font-semibold text-navy transition hover:bg-gold-700 hover:text-cream"
              >
                Get Blueprint Premium, $297
              </button>
            </form>
            <Link href="/pricing" className="text-sm text-cream/80 underline underline-offset-4 hover:text-gold">
              Compare Core and Premium
            </Link>
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="bg-cream">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-xs leading-relaxed text-ink/55">
            This is education and real estate guidance, not legal, tax, or financial advice. Ryan Riggins is a
            licensed North Carolina real estate broker (#361546, eXp Realty) and works as a fiduciary to the
            families he serves. We coordinate with your attorney, tax professional, and financial advisor. We do
            not replace them. Questions? Email{" "}
            <a href={`mailto:${SITE.supportEmail}`} className="underline">{SITE.supportEmail}</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
