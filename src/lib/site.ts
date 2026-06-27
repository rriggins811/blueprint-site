export const SITE = {
  name: "The Senior Transition Blueprint",
  shortName: "Blueprint",
  description:
    "The 19-module course that walks families through moving a parent from the family home to senior living. Built by a contractor who has done it for hundreds of families.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://blueprint.rigginsstrategicsolutions.com",
  rssSite: "https://rigginsstrategicsolutions.com",
  seniorsafeSite: "https://seniorsafeapp.com",
  supportEmail: "support@rigginsstrategicsolutions.com",
  // 60-minute Premium planning call. Hardcoded single source of truth (mirrors
  // rss-site src/lib/booking.ts). Google Calendar appointment schedule (Google
  // Workspace, already paid; Google Meet auto-attaches). cal.com retired Jun
  // 2026. The old NEXT_PUBLIC_CAL_BOOKING_URL env override was dropped on
  // purpose: NEXT_PUBLIC_* vars inline at build time, so a stale Vercel value
  // would have silently overridden this. The Vercel env var is now dead config
  // (safe to delete).
  premiumCalBookingUrl:
    "https://calendar.google.com/calendar/appointments/schedules/AcZssZ36_aKkOtOdsloP36J9PSKl2qOSD2bYnDU3mCfdYauXFjxjgSq5B_T0Rrb7CfZltK4uZF6eAfnu",
  premiumSupportDays: 90,
} as const;

export function premiumExpiresFromGrant(grant: unknown): Date | null {
  if (!grant || typeof grant !== "object") return null;
  const g = grant as { purchased_at?: string };
  if (!g.purchased_at) return null;
  const start = new Date(g.purchased_at);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + SITE.premiumSupportDays * 24 * 60 * 60 * 1000);
}

export const PRICING = {
  map: {
    label: "Blueprint Map",
    priceUsd: 9.99,
    // Live one-time price (prod_Ui0eEG839ipSlF), created 2026-06-15. Stripe
    // price ids are NOT secrets (they ride along in client-side checkout), so
    // this is hardcoded to skip an extra env var. Move to env if a separate
    // test-mode price is ever needed.
    stripePriceId: "price_1TiacqFoeumweL6DQSS4zwxj",
  },
  // Ascension: a $9.99 Map buyer upgrades to the full Blueprint Core for a
  // discounted $30 (a dedicated $30 price on the SAME Core product, so the
  // webhook grants normal Core access). Linked from the map's locked-tool CTA.
  mapUpgrade: {
    label: "Blueprint Core (Map upgrade)",
    priceUsd: 30,
    stripePriceId: "price_1TibMGFoeumweL6DnXG5OE0f",
  },
  core: {
    label: "Blueprint Core",
    priceUsd: 47,
    stripePriceId: process.env.STRIPE_PRICE_BLUEPRINT_CORE!,
    courseAccessKey: "blueprint_core" as const,
  },
  premium: {
    label: "Senior Transition Roadmap",
    priceUsd: 297,
    stripePriceId: process.env.STRIPE_PRICE_BLUEPRINT_PREMIUM!,
    courseAccessKey: "blueprint_premium" as const,
  },
} as const;

export type CourseAccessKey =
  | typeof PRICING.core.courseAccessKey
  | typeof PRICING.premium.courseAccessKey;
