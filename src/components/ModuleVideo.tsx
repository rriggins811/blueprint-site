// Module overview video. An AI-narrated ~2-minute "Brief" that sits at the very
// top of each Blueprint module, above the written lesson, so a user can watch it
// or scroll straight into reading. Autoplay is off, standard controls are on.
//
// Files live in the PUBLIC Supabase Storage bucket "module-videos", one per
// module named by slug: module-00.mp4 ... module-19.mp4, module-19-premium.mp4.
// Hosted off-repo on purpose: the 21 files total ~194 MB, which has no business
// in git history or a Vercel build. The premium module's page is already hidden
// from non-premium users by the tier gate in the module route; the video file
// itself is a short, non-sensitive overview so it does not need URL-level
// gating.
//
// preload="metadata" shows the first frame as a still and the duration without
// pulling the whole file on page load, so the page stays fast.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const VIDEO_BASE = `${SUPABASE_URL}/storage/v1/object/public/module-videos`;

export function ModuleVideo({ slug }: { slug: string }) {
  if (!SUPABASE_URL) return null;
  const src = `${VIDEO_BASE}/${slug}.mp4`;

  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-black shadow-sm">
        <video
          className="h-auto w-full"
          controls
          playsInline
          preload="metadata"
          aria-label="AI-narrated overview video for this module"
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        AI-narrated overview of this module. The material, method, and words are
        Ryan&rsquo;s.
      </p>
    </div>
  );
}
