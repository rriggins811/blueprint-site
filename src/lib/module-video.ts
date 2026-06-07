import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// Resolves the overview-video URL for a module. Core modules are served from a
// PUBLIC Supabase Storage bucket by slug. The premium module lives in a SEPARATE
// PRIVATE bucket and is served through a short-lived signed URL so the file is
// not reachable by guessing the URL, only by a Premium customer who has passed
// the page tier gate.
//
// Files (off-repo; the 21 clips total ~194 MB):
//   public  bucket "module-videos":          module-00.mp4 ... module-19.mp4
//   private bucket "module-videos-premium":  module-19-premium.mp4

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLIC_BUCKET = "module-videos";
const PREMIUM_BUCKET = "module-videos-premium";

export function publicModuleVideoUrl(slug: string): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/${slug}.mp4`;
}

// Server-only. Mint a 2-hour signed URL for a premium module's private video.
// Call this ONLY after the tier gate has passed, so a non-premium visitor never
// receives a usable link. The module page renders dynamically per request, so a
// fresh URL is signed on every load and the short expiry is never a problem.
export async function signedPremiumModuleVideoUrl(
  slug: string
): Promise<string | null> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.storage
      .from(PREMIUM_BUCKET)
      .createSignedUrl(`${slug}.mp4`, 60 * 60 * 2);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

// Picks the correct source for a module: a signed private URL for premium-only
// modules, a public URL otherwise.
export async function resolveModuleVideoUrl(module: {
  slug: string;
  premiumOnly?: boolean;
}): Promise<string | null> {
  return module.premiumOnly
    ? signedPremiumModuleVideoUrl(module.slug)
    : publicModuleVideoUrl(module.slug);
}
