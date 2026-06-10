"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE } from "@/lib/site";

const Schema = z.object({
  email: z.string().email(),
});

// Trigger Supabase's password reset email. The recovery link is routed THROUGH
// /auth/callback (which exchanges the ?code for a real session via the SSR
// cookie client) and then forwarded to /auth/reset, where the now-authenticated
// user sets a new password. Previously the link pointed straight at /auth/reset,
// which never exchanged the code, so every reset bounced back unauthenticated
// and no one could complete a reset. Outlook Safe Links can still pre-fetch and
// burn the one-time nonce, but the common same-browser flow now works.
export async function sendPasswordReset(formData: FormData) {
  const parsed = Schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    redirect("/forgot-password?sent=1"); // intentionally same response — don't leak existence
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE.url}/auth/callback?next=/auth/reset`,
  });
  // Always show the same success page regardless of whether the email exists,
  // to avoid revealing account existence.
  redirect("/forgot-password?sent=1");
}
