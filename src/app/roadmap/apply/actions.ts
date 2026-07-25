"use server";

// Roadmap application (free pivot, Jul 24 2026). The Roadmap is free but
// gated by FIT, not price: this form is what Ryan reviews before the intake
// call. No login required — friction here costs real families.
//
// Order of operations matters:
//   1. Supabase insert (source of truth — never lose an application)
//   2. redirect to /roadmap/thanks (booking page, strike while hot)
//   3. after(): GHL contact upsert + Referral Pipeline opportunity + SMS to
//      Ryan. CRM hiccups must never eat an application or block the redirect.

import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import {
  callGhlProxy,
  upsertGhlContactWithTags,
} from "@/lib/ghl-proxy";
import { notifyRoadmapApplication } from "@/lib/webhooks";

// Referral Pipeline (created Jul 8 2026 in GHL; ids verified live Jul 24).
const REFERRAL_PIPELINE_ID = "sz73r9OshVDdLxy3bEVc";
const STAGE_CONVERSATION_ID = "0675a5ad-cd1b-45cb-b37c-ecaf3858530b";

const FormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().min(7, "Enter a phone number.").max(30),
  state: z.string().trim().min(2, "Which state is the home in?").max(40),
  relationship: z.enum(["myself", "parent", "spouse", "other-family", "other"]),
  homeSituation: z.enum([
    "own-free-and-clear",
    "own-with-mortgage",
    "renting",
    "already-listed",
    "not-sure",
  ]),
  timeline: z.enum(["now", "3-6-months", "6-12-months", "exploring"]),
  biggestConcern: z.string().trim().min(1, "Tell us the biggest concern.").max(4000),
  professionals: z.array(z.string().max(60)).max(10).optional().default([]),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

const LABELS: Record<string, string> = {
  "own-free-and-clear": "Owns home free and clear",
  "own-with-mortgage": "Owns home with a mortgage",
  renting: "Renting",
  "already-listed": "Home already listed",
  "not-sure": "Not sure",
  now: "Ready now",
  "3-6-months": "3 to 6 months",
  "6-12-months": "6 to 12 months",
  exploring: "Still exploring",
};

function errorRedirect(message: string): string {
  return `/roadmap/apply?error=${encodeURIComponent(message)}`;
}

export async function submitRoadmapApplication(formData: FormData) {
  const parsed = FormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    relationship: formData.get("relationship"),
    homeSituation: formData.get("homeSituation"),
    timeline: formData.get("timeline"),
    biggestConcern: formData.get("biggestConcern"),
    professionals: formData.getAll("professionals").map(String),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Please check the form.";
    redirect(errorRedirect(first));
  }

  const app = parsed.data;
  const admin = createAdminSupabaseClient();

  const { error: insertError } = await admin.from("roadmap_applications").insert({
    first_name: app.firstName,
    last_name: app.lastName,
    email: app.email,
    phone: app.phone,
    state: app.state,
    relationship: app.relationship,
    home_situation: app.homeSituation,
    timeline: app.timeline,
    biggest_concern: app.biggestConcern,
    professionals: app.professionals,
    notes: app.notes || null,
    status: "submitted",
  });

  if (insertError) {
    console.error("[roadmap-apply] insert failed:", insertError.message);
    redirect(
      errorRedirect("Something went wrong saving your application. Please try again.")
    );
  }

  // CRM + notification fan-out. Failure here is logged, never user-facing.
  after(
    (async () => {
      try {
        const upsert = await upsertGhlContactWithTags(
          {
            email: app.email,
            firstName: app.firstName,
            lastName: app.lastName,
            phone: app.phone,
            source: "roadmap-application",
          },
          ["roadmap-application", "stage-new-lead"]
        );

        if (upsert.ok) {
          const opp = await callGhlProxy({
            action: "post",
            path: "/opportunities/",
            body: {
              pipelineId: REFERRAL_PIPELINE_ID,
              pipelineStageId: STAGE_CONVERSATION_ID,
              contactId: upsert.contactId,
              name: `${app.firstName} ${app.lastName} — Roadmap application`,
              status: "open",
            },
          });
          if (!opp.ok) {
            console.error("[roadmap-apply] opportunity create failed:", opp.error);
          }
        } else {
          console.error("[roadmap-apply] GHL upsert failed:", upsert.error);
        }
      } catch (e) {
        console.error("[roadmap-apply] GHL fan-out threw:", e);
      }

      await notifyRoadmapApplication({
        email: app.email,
        firstName: app.firstName,
        lastName: app.lastName,
        phone: app.phone,
        homeSituation: LABELS[app.homeSituation] ?? app.homeSituation,
        timeline: LABELS[app.timeline] ?? app.timeline,
      }).catch((e) => console.error("[roadmap-apply] notify failed:", e));
    })()
  );

  redirect("/roadmap/thanks");
}
