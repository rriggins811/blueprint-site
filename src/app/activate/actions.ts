"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { after } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { verifyActivationToken } from "@/lib/activation-token";
import { applyFreeTierSetup } from "@/lib/onboard-free-user";

const FormSchema = z
  .object({
    token: z.string().min(10),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    password: z.string().min(8).max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

function buildErrorRedirect(token: string, message: string): string {
  return `/activate?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`;
}

// POST /activate
//
// Two-path flow:
//   A) signUp succeeds → user is auto-logged-in, run free-tier setup, redirect.
//   B) signUp fails because the email already has an account → fall back to
//      signInWithPassword with the same credentials. If that succeeds the
//      user just logged in normally (legitimate re-activation flow). If it
//      fails (wrong password) we send them to /forgot-password since they
//      clearly forgot what they set previously.
export async function activate(formData: FormData) {
  const parsed = FormSchema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  const tokenStr = (formData.get("token") as string | null) ?? "";

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    redirect(buildErrorRedirect(tokenStr, first));
  }

  const { token, firstName, lastName, password } = parsed.data;
  const verified = verifyActivationToken(token);
  if (!verified.ok) {
    // Bounce back to /activate with the same token so the page can render
    // the expired-or-invalid view from its own logic.
    redirect(`/activate?token=${encodeURIComponent(token)}`);
  }

  const email = verified.payload.email;
  const supabase = await createServerSupabaseClient();

  // Path A: try signUp first. This creates the auth user and signs them in.
  const signUpRes = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
    },
  });

  // Two error variants from Supabase signUp on duplicate email:
  //   - "User already registered" (older)
  //   - "user_already_exists" code (newer)
  // Catch both; on duplicate, fall through to password sign-in path.
  const isDuplicate =
    signUpRes.error &&
    (/already.*registered/i.test(signUpRes.error.message) ||
      signUpRes.error.message.toLowerCase().includes("already") ||
      signUpRes.error.message.toLowerCase().includes("duplicate"));

  if (signUpRes.error && !isDuplicate) {
    redirect(buildErrorRedirect(token, signUpRes.error.message));
  }

  if (isDuplicate) {
    // User already exists in auth.users. The HMAC token in the URL proves the
    // email reached this person, which is the same threat model as a password
    // reset link. Trust it and overwrite the password via the admin client.
    // This handles the "broken-magic-link backfill" case where the user has
    // a row but doesn't know their password (auto-set during the old flow).
    const admin = createAdminSupabaseClient();
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.data?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!existing) {
      // Should never happen — signUp said duplicate but listUsers can't find them.
      // Send to forgot-password as a safe fallback.
      redirect(
        `/forgot-password?email=${encodeURIComponent(email)}&from=activate`
      );
    }
    const upd = await admin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (upd.error) {
      redirect(buildErrorRedirect(token, upd.error.message));
    }

    // Backfill SeniorSafe trial + ensure free-tier course_access. Idempotent —
    // won't downgrade a paid Blueprint tier or reset an already-used trial.
    const setup = await applyFreeTierSetup({
      userId: existing.id,
      email,
      firstName,
      lastName,
      source: "blueprint-activation-backfill",
    });
    after(setup.fanout);

    // Sign them in with the password we just set.
    const signInRes = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInRes.error) {
      redirect(buildErrorRedirect(token, signInRes.error.message));
    }
    redirect("/dashboard");
  }

  // signUp succeeded. The user_id is on signUpRes.data.user.
  const userId = signUpRes.data.user?.id;
  if (!userId) {
    redirect(buildErrorRedirect(token, "Activation succeeded but no user id returned."));
  }

  // Run the free-tier + SeniorSafe-trial setup. The fan-out (Make / GHL /
  // Kit / Twilio) goes through after() so the response can return without
  // waiting on those network calls.
  const result = await applyFreeTierSetup({
    userId,
    email,
    firstName,
    lastName,
    source: "blueprint-activation",
  });
  after(result.fanout);

  redirect("/dashboard");
}
