"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SITE } from "@/lib/site";

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

function safeNext(raw: string | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

// Password sign-in. The magic-link fallback was removed because Outlook Safe
// Links pre-fetches one-time-code URLs and burns them. Activation flow now
// gates the initial password creation; users who forget can hit
// /forgot-password.
export async function signIn(formData: FormData) {
  const parsed = FormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    redirect(
      `/login?error=${encodeURIComponent("Enter your email and password.")}`
    );
  }

  const next = safeNext(parsed.data.next);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
    );
  }
  redirect(next);
}

// Server action that kicks off Supabase's Google OAuth flow. Reuses the
// existing SeniorSafe-configured Google provider — does not modify provider
// config. Sends the user to Google's consent screen; Google redirects back
// to /auth/callback, which runs first-time onboarding (free tier course_access
// + SeniorSafe trial) for new users.
export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(
    (formData.get("next") as string | null) ?? undefined
  );
  const supabase = await createServerSupabaseClient();

  const callback = new URL(`${SITE.url}/auth/callback`);
  if (next !== "/dashboard") callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data?.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Google sign-in unavailable")}`
    );
  }
  redirect(data.url);
}
