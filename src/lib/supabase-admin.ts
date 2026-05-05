import { createClient } from "@supabase/supabase-js";

// Service role client. Bypasses RLS. Server-only.
// Use only in webhook handlers or trusted server-side flows.
// Never import this in a Client Component or expose the key to the browser.
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
