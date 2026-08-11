import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { verifyIntakeToken } from "@/lib/intake-token";
import { IntakeForm } from "./IntakeForm";

/**
 * /roadmap/intake
 *
 * Reached from a signed link in the Roadmap confirmation email. No login: the
 * family already proved who they are by applying, and a login wall on an
 * optional form is the fastest way to lose a tired person.
 *
 * Everything already known from the application is pre-filled and never asked
 * again. That is rule one of the spec, and it is the difference between a form
 * that feels like a courtesy and one that feels like a wall.
 */

export const metadata: Metadata = {
  title: "Your intake, before the call",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-xl border border-[#e7e2d6] bg-white p-8">{children}</div>
    </main>
  );
}

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const verified = verifyIntakeToken(t);

  if (!verified.ok) {
    const message =
      verified.reason === "expired"
        ? "This link has expired. Reply to your confirmation email and Ryan will send a fresh one, or just bring the answers to the call."
        : "This link is not valid. Reply to your confirmation email and Ryan will send a fresh one.";
    return (
      <Shell>
        <h1 className="font-serif text-2xl text-[#1B365D]">We could not open your intake</h1>
        <p className="mt-4 leading-relaxed text-[#4a5568]">{message}</p>
        <p className="mt-4 text-sm text-[#6b7280]">
          Nothing is lost either way. The intake is optional and the call works without it.
        </p>
      </Shell>
    );
  }

  const applicationId = verified.payload.applicationId;
  const admin = createAdminSupabaseClient();

  const [{ data: application }, { data: intake }] = await Promise.all([
    admin
      .from("roadmap_applications")
      .select(
        "id,first_name,last_name,email,phone,state,relationship,timeline,home_situation,pressure,senior_willingness"
      )
      .eq("id", applicationId)
      .maybeSingle(),
    admin.from("roadmap_intake").select("*").eq("application_id", applicationId).maybeSingle(),
  ]);

  if (!application) {
    return (
      <Shell>
        <h1 className="font-serif text-2xl text-[#1B365D]">We could not find your application</h1>
        <p className="mt-4 leading-relaxed text-[#4a5568]">
          Reply to your confirmation email and Ryan will sort it out. The call works without this
          form.
        </p>
      </Shell>
    );
  }

  if (intake?.submitted_at) {
    return (
      <Shell>
        <h1 className="font-serif text-2xl text-[#1B365D]">Got it, thank you</h1>
        <p className="mt-4 leading-relaxed text-[#4a5568]">
          Your intake is already in. Ryan reads it before your call, so you will not have to repeat
          any of it. If something changes before then, reply to your confirmation email.
        </p>
      </Shell>
    );
  }

  // Rule one: never ask for anything they already told us. Everything the
  // application captured is seeded into the matching intake fields.
  const prefill = {
    your_info_json: {
      your_name: `${application.first_name} ${application.last_name}`.trim(),
      phone: application.phone,
      email: application.email,
      relationship_to_senior: mapRelationship(application.relationship),
      ...(intake?.your_info_json ?? {}),
    },
    senior_info_json: intake?.senior_info_json ?? {},
    home_info_json: {
      ownership: mapHomeSituation(application.home_situation),
      ...(intake?.home_info_json ?? {}),
    },
    other_property_json: intake?.other_property_json ?? {},
    pressure_offers_json: {
      received_we_buy_houses_or_cash_offers: mapPressure(application.pressure),
      ...(intake?.pressure_offers_json ?? {}),
    },
    financial_json: intake?.financial_json ?? {},
    legal_json: intake?.legal_json ?? {},
    family_dynamics_json: {
      senior_willingness: mapWillingness(application.senior_willingness),
      ...(intake?.family_dynamics_json ?? {}),
    },
    transition_status_json: {
      where_are_you: mapTimeline(application.timeline),
      ...(intake?.transition_status_json ?? {}),
    },
    goals_json: intake?.goals_json ?? {},
  };

  // Seed the row with the prefill on first load.
  //
  // Found in end-to-end testing: prefilled values only reached the database
  // when the family actually walked onto that screen and triggered an
  // autosave. Someone who stopped at Legal never saved section 9, so the
  // timeline we already knew from their application was absent from the
  // assembled intake and the roadmap read "nothing captured" for The
  // Transition. Writing the seed up front means a partial intake still
  // carries everything the application already told us.
  if (!intake) {
    const { error: seedError } = await admin.from("roadmap_intake").upsert(
      { application_id: applicationId, ...prefill },
      { onConflict: "application_id" }
    );
    if (seedError) {
      // Non-fatal: the form still works, autosave will create the row.
      console.error("[roadmap-intake] seed failed:", seedError.message);
    }
  }

  return (
    <IntakeForm
      token={t as string}
      firstName={application.first_name}
      initialData={prefill}
      initialSkips={(intake?.skips_json ?? {}) as Record<string, never>}
      initialSection={intake?.last_section ?? 0}
    />
  );
}

// Application enums do not match the intake's option labels one for one, so
// map rather than dump raw values into a select that would not match them.
function mapRelationship(v: string | null): string {
  switch (v) {
    case "parent":
      return "";
    case "spouse":
      return "Spouse";
    case "myself":
      return "";
    default:
      return v ? "Other" : "";
  }
}

function mapHomeSituation(v: string | null): string {
  switch (v) {
    case "own-free-and-clear":
      return "Own paid off";
    case "own-with-mortgage":
      return "Own with a mortgage";
    case "renting":
      return "Rent";
    default:
      return "";
  }
}

function mapTimeline(v: string | null): string {
  switch (v) {
    case "now":
      return "Urgent, 0 to 3 months";
    case "3-6-months":
    case "6-12-months":
      return "Getting close, 3 to 12 months";
    case "exploring":
      return "Planning ahead, 1 to 5+ years";
    default:
      return "";
  }
}

function mapPressure(v: string | null): string {
  switch (v) {
    case "no":
      return "No";
    case "letters-calls":
      return "A few";
    case "actively-pushing":
    case "signed-or-about-to":
      return "A lot";
    default:
      return "";
  }
}

function mapWillingness(v: string | null): string {
  switch (v) {
    case "willing":
      return "Willing";
    case "reluctant":
      return "Reluctant";
    case "resistant":
      return "Resistant";
    default:
      return "";
  }
}
