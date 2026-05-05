"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE } from "@/lib/site";

const FormSchema = z.object({
  email: z.string().email(),
});

export async function sendMagicLink(formData: FormData) {
  const parsed = FormSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email.")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
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
