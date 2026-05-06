"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE } from "@/lib/site";

const Schema = z.object({
  email: z.string().email(),
});

// Trigger Supabase's password reset email. Reset link from this email DOES
// auth the user via PKCE — Outlook Safe Links can pre-fetch and burn the
// nonce, but password reset is rare enough that we accept this trade-off
// for now (vs. building a separate token-based reset flow).
export async function sendPasswordReset(formData: FormData) {
  const parsed = Schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    redirect("/forgot-password?sent=1"); // intentionally same response — don't leak existence
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE.url}/auth/reset`,
  });
  // Always show the same success page regardless of whether the email exists,
  // to avoid revealing account existence.
  redirect("/forgot-password?sent=1");
}
