"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const Schema = z
  .object({
    password: z.string().min(8).max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function setPasswordAfterReset(formData: FormData) {
  const parsed = Schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    redirect(`/auth/reset?error=${encodeURIComponent(first)}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    redirect(`/auth/reset?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
