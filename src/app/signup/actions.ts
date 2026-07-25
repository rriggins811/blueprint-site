"use server";

// Public free-signup action (free pivot, Jul 24 2026). Unlike /activate this
// takes a typed email with NO activation token, so on a duplicate email we
// must NOT overwrite the password (no proof of mailbox ownership). Duplicates
// get bounced to /login with a friendly notice instead.

import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { applyFreeTierSetup } from "@/lib/onboard-free-user";
import { fireServerLead } from "@/lib/meta/server-fires";

const FormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(100),
    lastName: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => v ?? ""),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

function errorRedirect(message: string, email?: string): string {
  const params = new URLSearchParams({ error: message });
  if (email) params.set("email", email);
  return `/signup?${params.toString()}`;
}

export async function signupFree(formData: FormData) {
  const parsed = FormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    redirect(errorRedirect(first, String(formData.get("email") ?? "")));
  }

  const { firstName, lastName, email, password } = parsed.data;
  const supabase = await createServerSupabaseClient();

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
    redirect(
      `/login?email=${encodeURIComponent(email)}&notice=${encodeURIComponent(
        "You already have an account. Log in below, or reset your password if you forgot it."
      )}`
    );
  }

  if (signUpRes.error || !signUpRes.data.user) {
    redirect(errorRedirect(signUpRes.error?.message ?? "Signup failed. Try again.", email));
  }

  const userId = signUpRes.data.user.id;

  const setup = await applyFreeTierSetup({
    userId,
    email,
    firstName,
    lastName,
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
      customData: { content_name: "blueprint_free_signup" },
    })
  );

  redirect("/dashboard?welcome=1");
}
