"use server";

// Zero-friction Blueprint signup (Jul 27 2026).
//
// The Blueprint is free, so a password was pure conversion drag: it is the
// single biggest drop-off on an ad click. We now create the account with a
// generated password the user never sees, sign them in server-side, and drop
// them straight on the dashboard. Return visits use a one-tap magic link.
//
// Duplicate email: they never HAD a password, so asking for one is a dead end.
// They get a magic link instead. We still never overwrite an existing password.

import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { applyFreeTierSetup } from "@/lib/onboard-free-user";
import { fireServerLead } from "@/lib/meta/server-fires";

// Captured at signup so the nurture can branch from day one instead of waiting
// a month for click data. Also tells us what ad spend is actually buying.
const SITUATIONS = ["crisis", "soon", "planning"] as const;

const FormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => v ?? ""),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  situation: z
    .enum(SITUATIONS)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? (v as (typeof SITUATIONS)[number]) : undefined)),
});

function errorRedirect(message: string, email?: string): string {
  const params = new URLSearchParams({ error: message });
  if (email) params.set("email", email);
  return `/signup?${params.toString()}`;
}

// The user never sees this. Long and random so the account is not guessable;
// real re-entry happens by magic link.
function generatePassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signupFree(formData: FormData) {
  const parsed = FormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    situation: formData.get("situation"),
  });

  if (!parsed.success) {
    const first =
      parsed.error.issues[0]?.message ?? "Check the form and try again.";
    redirect(errorRedirect(first, String(formData.get("email") ?? "")));
  }

  const { firstName, lastName, email, phone, situation } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const password = generatePassword();

  const signUpRes = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });

  const isDuplicate =
    signUpRes.error &&
    (/already.*registered/i.test(signUpRes.error.message) ||
      signUpRes.error.message.toLowerCase().includes("already") ||
      signUpRes.error.message.toLowerCase().includes("duplicate"));

  if (isDuplicate) {
    // No password to fall back on, so send a one-tap link.
    // emailRedirectTo is REQUIRED here: the Supabase project Site URL is
    // app.seniorsafeapp.com (shared project), so omitting it would land a
    // Blueprint user inside the SeniorSafe app. blueprint.rigginsstrategic
    // solutions.com/** is on the redirect allowlist.
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          "https://blueprint.rigginsstrategicsolutions.com/auth/callback",
      },
    });
    redirect(
      `/login?email=${encodeURIComponent(email)}&notice=${encodeURIComponent(
        "You already have an account. Check your email, we just sent a one-tap link to get you back in."
      )}`
    );
  }

  if (signUpRes.error || !signUpRes.data.user) {
    redirect(
      errorRedirect(
        signUpRes.error?.message ?? "Signup failed. Try again.",
        email
      )
    );
  }

  const userId = signUpRes.data.user.id;

  // Establish the session so they land INSIDE the dashboard. If email
  // confirmation is enabled in Supabase this errors, and we route them to
  // check their inbox rather than into a dead end.
  const signInRes = await supabase.auth.signInWithPassword({ email, password });

  const setup = await applyFreeTierSetup({
    userId,
    email,
    firstName,
    lastName,
    phone,
    situation,
    source: "blueprint-free-signup",
  });
  after(setup.fanout);

  after(
    fireServerLead({
      userId,
      email,
      firstName,
      lastName,
      source: "blueprint-free-signup",
      customData: {
        content_name: "blueprint_free_signup",
        situation: situation ?? "unknown",
      },
    })
  );

  if (signInRes.error) {
    redirect(
      `/login?email=${encodeURIComponent(email)}&notice=${encodeURIComponent(
        "Your account is ready. Check your email to confirm it, then you are in."
      )}`
    );
  }

  redirect("/dashboard?welcome=1");
}
