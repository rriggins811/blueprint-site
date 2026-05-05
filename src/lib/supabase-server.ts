import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use in Server Components, Server Actions, Route Handlers.
// Reads/refreshes the user's session cookie.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll() called from a Server Component. Safe to ignore.
            // The middleware will refresh sessions on the next request.
          }
        },
      },
    }
  );
}
