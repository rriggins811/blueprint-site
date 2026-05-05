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
} as const;

export const PRICING = {
  core: {
    label: "Blueprint Core",
    priceUsd: 47,
    stripePriceId: process.env.STRIPE_PRICE_BLUEPRINT_CORE!,
    courseAccessKey: "blueprint_core" as const,
  },
  premium: {
    label: "Blueprint Premium",
    priceUsd: 297,
    stripePriceId: process.env.STRIPE_PRICE_BLUEPRINT_PREMIUM!,
    courseAccessKey: "blueprint_premium" as const,
  },
} as const;

export type CourseAccessKey =
  | typeof PRICING.core.courseAccessKey
  | typeof PRICING.premium.courseAccessKey;
