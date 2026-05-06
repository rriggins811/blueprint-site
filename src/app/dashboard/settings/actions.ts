"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const Schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

// Set or change the signed-in user's password.
//
// Supabase requires the signed-in user to have a "fresh" session for a
// destructive auth change. Magic-link and OAuth sessions are fresh on the
// initial sign-in for a few minutes. After that window, Supabase requires
// the reauthentication-via-nonce flow. We surface that as a clear error
// here so the user knows to log out and back in. A future iteration can
// add the reauth-nonce dance inline.
export async function setOrChangePassword(formData: FormData) {
  const parsed = Schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    redirect(`/dashboard/settings?error=${encodeURIComponent(first)}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    // Supabase returns "reauthentication required" or similar for stale sessions.
    // Tell the user how to recover without leaving them stuck.
    const friendly =
      /reauth/i.test(error.message)
        ? "For your security, log out and sign back in, then try again immediately."
        : error.message;
    redirect(
      `/dashboard/settings?error=${encodeURIComponent(friendly)}`
    );
  }

  redirect("/dashboard/settings?ok=1");
}
