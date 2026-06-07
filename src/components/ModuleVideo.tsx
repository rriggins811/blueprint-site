// Module overview video. An AI-narrated ~2-minute "Brief" that sits at the very
// top of each Blueprint module, above the written lesson, so a user can watch it
// or scroll straight into reading. Autoplay is off, standard controls are on.
//
// The `src` is resolved server-side by the module page (see lib/module-video.ts):
// a public URL for core modules, a short-lived signed URL for the premium one.
// If no source is available, the section renders nothing rather than a broken
// player.
//
// preload="metadata" shows the first frame as a still and the duration without
// pulling the whole file on page load, so the page stays fast.

export function ModuleVideo({ src }: { src: string | null }) {
  if (!src) return null;

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
