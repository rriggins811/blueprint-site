import Link from "next/link";
import { INTAKE_CALL_EMBED_URL, INTAKE_CALL_URL } from "@/lib/booking";
import { verifyIntakeToken } from "@/lib/intake-token";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = {
  title: "Application received. Book your intake call.",
  robots: { index: false },
};

export default async function RoadmapThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  // The apply action hands us a signed intake token. Offering the intake here
  // is deliberate: they have just booked, which is the most willing they will
  // ever be, and it keeps the application form short instead of asking a tired
  // family seventy questions in one sitting. Entirely optional, and the link
  // also reaches them by email later.
  const { t } = await searchParams;
  const intakeOk = verifyIntakeToken(t).ok;

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
          Application received
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          One step left: pick a time for your intake call.
        </h1>
        <p className="mt-4 text-neutral-600">
          Ryan reviews every application personally before the call. Grab a
          time below while you are here, and he will come to the call already
          knowing your situation. The call runs on Google Meet, and a link
          arrives with your confirmation email.
        </p>

        <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
          <iframe
            src={INTAKE_CALL_EMBED_URL}
            title="Book your Roadmap intake call"
            className="h-[640px] w-full"
            loading="lazy"
          />
        </div>

        <p className="mt-4 text-sm text-neutral-500">
          Scheduler not loading?{" "}
          <a
            href={INTAKE_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-neutral-900 underline"
          >
            Open the booking page in a new tab.
          </a>
        </p>

        {intakeOk && (
          <div className="mt-10 rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
              Optional, and it makes your call better
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">
              Give Ryan a head start
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-700">
              A short set of questions about the home, the money, and the legal
              documents. Answer what you know, skip what you do not, and stop
              whenever you want. Even a half-finished one means less ground to
              cover on the call. Nothing here is required, and you can do it
              later instead.
            </p>
            <Link
              href={`/roadmap/intake?t=${encodeURIComponent(t as string)}`}
              className="mt-5 inline-block rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Start the intake
            </Link>
            <p className="mt-3 text-xs text-neutral-500">
              Your answers save as you go, so you can close this and come back
              to it.
            </p>
          </div>
        )}

        <div className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm leading-relaxed text-neutral-700">
          <p className="font-medium text-neutral-900">What happens next</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Ryan reviews your application before your call.</li>
            <li>Your intake call: where your family stands and what you need most.</li>
            <li>We build your written Senior Transition Roadmap together.</li>
            <li>
              A follow-up call walks through the plan and how your family moves
              forward. Where professionals are needed, Ryan brings them in, or
              works with the ones you already have.
            </li>
          </ol>
          <p className="mt-3">
            In the meantime, the full Blueprint is free.{" "}
            <Link href="/signup" className="font-medium text-neutral-900 underline">
              Create your free account
            </Link>{" "}
            and start with Module 00.
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
