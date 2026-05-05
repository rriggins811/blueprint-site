"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE } from "@/lib/site";

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

export async function signIn(formData: FormData) {
  const parsed = FormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email.")}`);
  }

  const { email, password } = parsed.data;
  const supabase = await createServerSupabaseClient();

  // Password path: signInWithPassword. Used when the user has set a password.
  if (password && password.length > 0) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    redirect("/dashboard");
  }

  // No password: send a magic link.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${SITE.url}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?sent=1");
}
