"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE } from "@/lib/site";

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  next: z.string().optional(),
});

// Only allow internal paths to prevent open redirects.
function safeNext(raw: string | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function signIn(formData: FormData) {
  const parsed = FormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email.")}`);
  }

  const { email, password } = parsed.data;
  const next = safeNext(parsed.data.next);
  const supabase = await createServerSupabaseClient();

  // Password path. Used when the user has set a password.
  if (password && password.length > 0) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      redirect(
        `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
      );
    }
    redirect(next);
  }

  // No password: send a magic link. Pass `next` through so post-callback we
  // route the user to where they came from (a PDF download, a tool, etc.).
  const callback = new URL(`${SITE.url}/auth/callback`);
  if (next !== "/dashboard") callback.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: false,
    },
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
    );
  }

  redirect(`/login?sent=1&next=${encodeURIComponent(next)}`);
}
