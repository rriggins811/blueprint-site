import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

// Shared identity footer for the PUBLIC pages (home, /pricing, /roadmap) only.
// This subdomain delivers the free Blueprint and Roadmap, so every public page names
// who is behind it and links back to the main site. Do NOT render this on
// dashboard or auth pages.
const STYLES = {
  // Neutral palette pages (home, /pricing).
  light: {
    wrap: "border-t border-neutral-200 bg-white",
    body: "text-neutral-500",
    lede: "text-neutral-700",
    link: "font-medium text-neutral-900 underline underline-offset-2 hover:text-amber-700",
  },
  // RSS brand palette page (/roadmap).
  cream: {
    wrap: "border-t border-cream-200 bg-cream",
    body: "text-ink/55",
    lede: "text-ink/80",
    link: "font-medium text-navy underline underline-offset-2 hover:text-gold-700",
  },
} as const;

export function PublicFooter({
  variant = "light",
  note,
}: {
  variant?: keyof typeof STYLES;
  /** Optional page-specific disclaimer line, rendered above the license line. */
  note?: ReactNode;
}) {
  const s = STYLES[variant];
  return (
    <footer className={s.wrap}>
      <div className={`mx-auto w-full max-w-5xl px-6 py-10 text-sm ${s.body}`}>
        <p className={s.lede}>
          The Senior Transition Blueprint is from Ryan Riggins, Senior
          Transition Advisor and Advocate, at Riggins Strategic Solutions.
        </p>
        <p className="mt-2">
          <a href={SITE.rssSite} className={s.link}>
            Meet Ryan and see everything we do at rigginsstrategicsolutions.com
          </a>
        </p>
        {note ? <p className="mt-4 text-xs leading-relaxed">{note}</p> : null}
        <p className="mt-4 text-xs">
          Ryan Riggins | Licensed NC Realtor #361546 | eXp Realty. Education,
          not legal, tax, or financial advice.
        </p>
        <p className="mt-1 text-xs">&copy; 2026 Riggins Strategic Solutions, LLC</p>
      </div>
    </footer>
  );
}
