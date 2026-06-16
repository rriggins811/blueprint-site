import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MODULES } from "@/lib/blueprint-modules";
import { TOOLS } from "@/lib/tools-registry";
import {
  parseCourseAccess,
  isModuleUnlocked,
  isToolUnlocked,
  isPaid,
} from "@/lib/access";

export const metadata = { title: "Your Blueprint" };

export default async function DashboardHome() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profile")
    .select("course_access, first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const access = parseCourseAccess(profile?.course_access);
  const firstName = profile?.first_name ?? null;

  // Map buyers ($9.99) get a private token to the interactive mind map on
  // rss-site. RPC is keyed on the caller's own email, so it returns only theirs.
  const { data: mapTokenRaw } = await supabase.rpc("my_blueprint_map_access");
  const mapToken = typeof mapTokenRaw === "string" ? mapTokenRaw : null;
  const hasPremium = access.tier === "premium";
  const isFreeTier = access.tier === "free";

  // Premium-only modules hide entirely from non-Premium users (rather than
  // showing as locked). Mixing 1 premium-locked card into a 21-card list
  // muddies the upgrade path. The /pricing page makes the Premium pitch.
  const visibleModules = MODULES.filter((m) => !m.premiumOnly || hasPremium);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mt-2 text-neutral-600">
          {isPaid(access)
            ? "Start at Module 00. Or jump to wherever your family is right now. Self-paced. Lifetime access."
            : "Module 00 is yours. Start with the Blueprint Map below to see every step in order, then unlock the full toolkit when you are ready."}
        </p>
      </header>

      {/* HERO 1 of 2 (mutually exclusive by gating): the $9.99 Map is the
          first thing a free user without the map sees. It is the
          anti-overwhelm shortcut, framed as a different KIND of thing than
          the free guides (the pieces) or Core (the tools). */}
      {isFreeTier && !mapToken ? (
        <section
          className="mb-6 rounded-xl border-2 p-6 sm:p-8"
          style={{ borderColor: "#1F3A5F", backgroundColor: "#1F3A5F" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "#D4AF37" }}
          >
            Start here
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            The Blueprint Map. Every step, in order.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            Not another stack of PDFs to dig through. The Map lays out every
            step of the transition on one screen, each with a short video that
            explains it in plain English. The calm shortcut when it all feels
            like too much.
          </p>
          <p className="mt-3 text-base text-white/90">
            The same video lessons and summaries from the $47 course, for{" "}
            <span className="font-semibold" style={{ color: "#D4AF37" }}>
              $9.99
            </span>
            .
          </p>
          <a
            href="https://rigginsstrategicsolutions.com/blueprint-preview"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-bold hover:opacity-90"
            style={{ backgroundColor: "#D4AF37", color: "#1F3A5F" }}
          >
            Get the Map for $9.99
          </a>
        </section>
      ) : null}

      {/* HERO 2 of 2: map buyers ($9.99) see their map at the top instead. */}
      {mapToken ? (
        <section
          className="mb-6 rounded-xl border-2 p-6 sm:p-8"
          style={{ borderColor: "#1F3A5F", backgroundColor: "#1F3A5F" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: "#D4AF37" }}
              >
                Your Blueprint Map
              </p>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-white/90">
                Every step in order, on one screen. All 19 module video lessons
                and summaries. Click any module to watch and read.
              </p>
            </div>
            <a
              href={`https://rigginsstrategicsolutions.com/blueprint-map?token=${mapToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-md px-5 py-3 text-sm font-bold hover:opacity-90"
              style={{ backgroundColor: "#D4AF37", color: "#1F3A5F" }}
            >
              Open the Map
            </a>
          </div>
        </section>
      ) : null}

      {/* Simple Blueprint PDF — the free starter map, post-activation. URL
          source-of-truth is FREEGUIDE_PDF_URL; fallback to the known prod
          path so a missing-env build doesn't hide the button. */}
      <section className="mb-6 rounded-lg border border-neutral-200 bg-amber-50/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-800">
              Your starter guide
            </p>
            <p className="mt-1 text-base text-neutral-800">
              The Simple Blueprint PDF, a 14-page, plain-English starter guide.
              Save it for later or print it out for the family.
            </p>
          </div>
          <a
            href={
              process.env.FREEGUIDE_PDF_URL ??
              "https://rigginsstrategicsolutions.com/files/simple-blueprint.pdf"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-700 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
          >
            Download Simple Blueprint (PDF)
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Modules</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {isPaid(access)
            ? `${visibleModules.length} modules. Self-paced.`
            : `1 of 21 unlocked.`}
        </p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleModules.map((m) => {
            const unlocked = isModuleUnlocked(m.slug, access);
            return (
              <li key={m.slug}>
                <ModuleCard
                  number={m.number}
                  title={m.title}
                  summary={m.summary}
                  toolCount={m.toolCount}
                  href={`/dashboard/${m.slug}`}
                  unlocked={unlocked}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Interactive tools</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {isFreeTier
            ? "3 of 9 calculators unlocked. The rest unlock with Core."
            : "All calculators unlocked."}
        </p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {TOOLS.filter((t) => t.componentKey).map((t) => {
            const unlocked = isToolUnlocked(t.slug, access);
            return (
              <li key={t.slug}>
                <ToolCard
                  title={t.title}
                  description={t.description}
                  href={`/dashboard/tools/${t.slug}`}
                  unlocked={unlocked}
                  premiumOnly={t.premiumOnly}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Your Library — the free guides, demoted to a quiet collapsible
          section so they stop competing with the Map for attention. Framed
          as "the pieces": individual guides for specific moments. The PDFs
          and download tracking are unchanged. */}
      <section className="mt-12">
        <details className="group rounded-lg border border-neutral-200 bg-neutral-50/60 p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="text-base font-semibold text-neutral-900">
                Your Library
              </span>
              <span className="mt-0.5 block text-sm text-neutral-600">
                The free guides you have access to. Individual pieces for
                specific moments. The Map above puts them in order.
              </span>
            </span>
            <span
              className="shrink-0 text-sm font-medium text-neutral-500 group-open:hidden"
              aria-hidden
            >
              Show
            </span>
            <span
              className="hidden shrink-0 text-sm font-medium text-neutral-500 group-open:inline"
              aria-hidden
            >
              Hide
            </span>
          </summary>
          <ul className="mt-4 divide-y divide-neutral-200 border-t border-neutral-200">
            {[
              {
                slug: "cash-buyer-beware",
                title: "Cash Buyer Beware",
                subtitle:
                  "The 15-page wholesaler protection guide. What to know before Mom signs anything.",
                pdfUrl:
                  "https://rigginsstrategicsolutions.com/downloads/cash-buyer-beware.pdf",
              },
              {
                slug: "when-mom-falls-crisis-playbook",
                title: "When Mom Falls at 2 AM",
                subtitle:
                  "The 17-page crisis playbook. The first 30 minutes and the 30 mistakes most families make.",
                pdfUrl:
                  "https://rigginsstrategicsolutions.com/downloads/when-mom-falls-crisis-playbook.pdf",
              },
              {
                slug: "aging-in-place-vs-assisted-living",
                title: "Aging in Place vs Assisted Living",
                subtitle:
                  "The 17-page decision guide. Real 5-year cost math and the 5 questions that actually decide.",
                pdfUrl:
                  "https://rigginsstrategicsolutions.com/downloads/aging-in-place-vs-assisted-living.pdf",
              },
              {
                slug: "medicare-coverage-gaps",
                title: "Medicare Coverage Gaps Most Families Don't Know About",
                subtitle:
                  "The 17-page coverage guide. The hospital and rehab questions that cost families $10K to $30K.",
                pdfUrl:
                  "https://rigginsstrategicsolutions.com/downloads/medicare-coverage-gaps.pdf",
              },
            ].map((m) => (
              <li
                key={m.slug}
                className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-neutral-900">
                    {m.title}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-700">{m.subtitle}</p>
                </div>
                <a
                  href={m.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="download_lead_magnet"
                  data-track-params={`{"magnet":"${m.slug}","source":"blueprint_dashboard"}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  Download PDF
                </a>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* Core upsell — the execution tier. Framed against the Map: the Map
          shows the steps, Core gives the tools to do each one. */}
      {isFreeTier ? (
        <section className="mt-12 rounded-lg border-2 border-amber-600 bg-amber-50 p-7 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-800">
            When you are ready to do the work
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Blueprint Core. All 21 modules, all 71 tools. $47 once.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-700">
            The Map shows you every step. Core gives you the tools to actually
            do each one: the scripts, checklists, and calculators. Lifetime
            access, no recurring charge. Premium adds a 60-minute call with
            Ryan.
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex items-center justify-center rounded-md bg-amber-700 px-5 py-3 text-sm font-medium text-white hover:bg-amber-800"
          >
            See pricing
          </Link>
        </section>
      ) : null}
    </main>
  );
}

function ModuleCard(props: {
  number: string;
  title: string;
  summary: string;
  toolCount: number;
  href: string;
  unlocked: boolean;
}) {
  const { number, title, summary, toolCount, href, unlocked } = props;
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Module {number}
        </p>
        {unlocked ? (
          <p className="text-xs text-neutral-500">
            {toolCount} tool{toolCount === 1 ? "" : "s"}
          </p>
        ) : (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
            Locked
          </span>
        )}
      </div>
      <h3
        className={
          "mt-1 text-lg font-semibold leading-snug " +
          (unlocked ? "text-neutral-900" : "text-neutral-500")
        }
      >
        {title}
      </h3>
      <p
        className={
          "mt-2 text-sm " + (unlocked ? "text-neutral-600" : "text-neutral-500")
        }
      >
        {summary}
      </p>
      {!unlocked ? (
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Unlock with Blueprint Core. $47
        </Link>
      ) : null}
    </>
  );

  if (unlocked) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-100/60 p-5">
      {inner}
    </div>
  );
}

function ToolCard(props: {
  title: string;
  description: string;
  href: string;
  unlocked: boolean;
  premiumOnly?: boolean;
}) {
  const { title, description, href, unlocked, premiumOnly } = props;
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={
            "text-base font-semibold " +
            (unlocked ? "text-neutral-900" : "text-neutral-500")
          }
        >
          {title}
        </h3>
        {!unlocked ? (
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
            Locked
          </span>
        ) : premiumOnly ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Premium
          </span>
        ) : null}
      </div>
      <p
        className={
          "mt-1 text-sm " + (unlocked ? "text-neutral-600" : "text-neutral-500")
        }
      >
        {description}
      </p>
      {!unlocked ? (
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Unlock with Blueprint Core. $47
        </Link>
      ) : null}
    </>
  );

  if (unlocked) {
    return (
      <Link
        href={href}
        className="flex h-full flex-col rounded-lg border border-neutral-200 p-5 transition hover:border-amber-600 hover:shadow-sm"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-200 bg-neutral-100/60 p-5">
      {inner}
    </div>
  );
}
