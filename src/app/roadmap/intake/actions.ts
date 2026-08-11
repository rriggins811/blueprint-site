"use server";

// Roadmap intake (Aug 10 2026). The family gets here from a signed link in the
// Roadmap confirmation email, so there is no login: a login wall on an
// optional form filled in by an exhausted adult child costs real completions.
//
// Same ordering discipline as roadmap/apply: Supabase first, always, then
// everything else. Answers can never be lost to a CRM hiccup.
//
// Two entry points:
//   saveIntakeSection  autosave, called as they work. Idempotent upsert.
//   submitIntake       they are done, or they chose to finish on the call.
//
// A partial submit is a real submit. The spec is explicit that a half-finished
// intake is enormously more useful than none, so nothing here treats an
// incomplete form as a failure state.

import { z } from "zod";
import { after } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { upsertGhlContactWithTags } from "@/lib/ghl-proxy";
import { verifyIntakeToken } from "@/lib/intake-token";
import { INTAKE_SECTIONS, SKIP_STATES } from "@/lib/intake-schema";
import { buildIntakeMarkdown, type IntakeRow, type ApplicationRow } from "@/lib/intake-markdown";
import { sendIntakeToRyan } from "@/lib/email/resend";

const VALID_COLUMNS = new Set(INTAKE_SECTIONS.map((s) => s.column));

const SavePayload = z.object({
  token: z.string().min(10),
  column: z.string().refine((c) => VALID_COLUMNS.has(c), "Unknown section."),
  // Answers for one section. Values stay loose on purpose: every field is
  // optional and the family may type anything. Depth and size are bounded
  // below rather than by shape.
  answers: z.record(z.string(), z.unknown()),
  skips: z.record(z.string(), z.enum(SKIP_STATES)),
  lastSection: z.number().int().min(0).max(INTAKE_SECTIONS.length),
});

/** Guard against a hostile or runaway payload without constraining real answers. */
function boundedJson(value: unknown, maxChars = 200_000): Record<string, unknown> {
  const s = JSON.stringify(value ?? {});
  if (s.length > maxChars) {
    throw new Error("Payload too large.");
  }
  return (value ?? {}) as Record<string, unknown>;
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveIntakeSection(input: unknown): Promise<SaveResult> {
  const parsed = SavePayload.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid save." };
  }
  const { token, column, answers, skips, lastSection } = parsed.data;

  const verified = verifyIntakeToken(token);
  if (!verified.ok) {
    return { ok: false, error: `Link is ${verified.reason.replace("_", " ")}.` };
  }
  const applicationId = verified.payload.applicationId;

  let payloadAnswers: Record<string, unknown>;
  let payloadSkips: Record<string, unknown>;
  try {
    payloadAnswers = boundedJson(answers);
    payloadSkips = boundedJson(skips, 40_000);
  } catch {
    return { ok: false, error: "That is more text than the form can save." };
  }

  const admin = createAdminSupabaseClient();

  // Merge skips rather than replace: each section only knows its own fields,
  // and a section-scoped replace would wipe flags recorded on other screens.
  const { data: existing } = await admin
    .from("roadmap_intake")
    .select("skips_json")
    .eq("application_id", applicationId)
    .maybeSingle();

  const mergedSkips = { ...(existing?.skips_json ?? {}), ...payloadSkips };

  const { error } = await admin
    .from("roadmap_intake")
    .upsert(
      {
        application_id: applicationId,
        [column]: payloadAnswers,
        skips_json: mergedSkips,
        last_section: lastSection,
      },
      { onConflict: "application_id" }
    );

  if (error) {
    console.error("[roadmap-intake] save failed:", error.message);
    return { ok: false, error: "Could not save just now. Your answers are still on screen." };
  }
  return { ok: true, savedAt: new Date().toISOString() };
}

const SubmitPayload = z.object({
  token: z.string().min(10),
  /** True when they reached the end, false when they chose to finish on the call. */
  complete: z.boolean(),
});

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitIntake(input: unknown): Promise<SubmitResult> {
  const parsed = SubmitPayload.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid submit." };

  const verified = verifyIntakeToken(parsed.data.token);
  if (!verified.ok) {
    return { ok: false, error: `Link is ${verified.reason.replace("_", " ")}.` };
  }
  const applicationId = verified.payload.applicationId;
  const admin = createAdminSupabaseClient();

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("roadmap_intake")
    .upsert(
      {
        application_id: applicationId,
        submitted_at: now,
        completed_at: parsed.data.complete ? now : null,
      },
      { onConflict: "application_id" }
    );

  if (updateError) {
    console.error("[roadmap-intake] submit failed:", updateError.message);
    return { ok: false, error: "Could not submit just now. Try again in a moment." };
  }

  // Everything downstream is best-effort and must never block the thank-you.
  after(
    (async () => {
      const { data: intake } = await admin
        .from("roadmap_intake")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();
      const { data: application } = await admin
        .from("roadmap_applications")
        .select("first_name,last_name,email,phone,state")
        .eq("id", applicationId)
        .maybeSingle();

      if (!intake || !application) {
        console.error("[roadmap-intake] post-submit rows missing", { applicationId });
        return;
      }

      // The generator-shaped document. Same text Ryan reads and the same text
      // that gets pasted into the roadmap brain, so the two can never diverge.
      const markdown = buildIntakeMarkdown({
        application: application as ApplicationRow,
        intake: intake as IntakeRow,
      });

      const emailed = await sendIntakeToRyan({
        applicantName: `${application.first_name} ${application.last_name}`.trim(),
        complete: Boolean(intake.completed_at),
        markdown,
      });
      if (!emailed.ok) {
        console.error("[roadmap-intake] email to Ryan failed:", emailed.reason);
      }

      // The tag is what tells Ryan at a glance which calls arrive prepared.
      const tag = intake.completed_at ? "intake-complete" : "intake-partial";
      const tagged = await upsertGhlContactWithTags(
        {
          email: application.email,
          firstName: application.first_name,
          lastName: application.last_name,
          phone: application.phone,
          source: "roadmap-intake",
        },
        [tag, "roadmap", "family"]
      );
      if (!tagged.ok) {
        console.error("[roadmap-intake] GHL tag failed:", tagged.error);
      }
    })()
  );

  return { ok: true };
}
