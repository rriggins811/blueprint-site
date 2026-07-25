// Tier-aware access model. course_access on user_profile holds:
//   { tier: "free" | "core" | "premium", modules: [...], tools: [...], premium_support?: bool, ... }
//
// For free tier, modules and tools are explicit allowlists of canonical names.
// For core/premium, the tier alone unlocks everything; arrays are ignored.
//
// Canonical names are NOT URL slugs. Tool URLs stay tool-NNX. The course_access
// arrays use friendly names like "prepquiz" or module slugs like "module-00".
// tools-registry.ts maps each tool's URL slug to its canonicalSlug for matching.

import { MODULES } from "./blueprint-modules";
import { TOOLS } from "./tools-registry";

export type Tier = "free" | "core" | "premium";

export type CourseAccess = {
  tier: Tier;
  modules: string[];
  tools: string[];
  premium_support?: boolean;
  // Free signup metadata
  signed_up_at?: string;
  // Paid purchase metadata (kept on the access for traceability)
  purchased_at?: string;
  stripe_customer_id?: string;
  stripe_session_id?: string;
  stripe_payment_id?: string | null;
  // Non-empty if user upgraded; useful for analytics/funnel
  upgraded_from?: Tier;
};

const FREE_DEFAULT: CourseAccess = {
  tier: "free",
  modules: ["module-00"],
  // Free tier tool list (decided May 5 during Phase 2 review):
  //   prepquiz                     ↔ tool-01a (Starting Point Assessment)
  //   net-proceeds-calculator      ↔ tool-09a (Net Proceeds Calculator)
  //   7-day-quick-start-checklist  ↔ tool-00a (Quick Start 7-Day Checklist)
  // Smart Prep Budget Calculator was swapped OUT (now paid-only) since it
  // delivers more value as a paid-tier draw and Module 00 already references
  // the 7-Day Checklist as a free toolkit item.
  tools: [
    "prepquiz",
    "net-proceeds-calculator",
    "7-day-quick-start-checklist",
  ],
};

export function freeTierAccess(now = new Date()): CourseAccess {
  return { ...FREE_DEFAULT, signed_up_at: now.toISOString() };
}

export function coreTierAccess(meta: {
  stripe_customer_id?: string;
  stripe_session_id?: string;
  stripe_payment_id?: string | null;
  upgraded_from?: Tier;
  now?: Date;
}): CourseAccess {
  return {
    tier: "core",
    modules: [],
    tools: [],
    purchased_at: (meta.now ?? new Date()).toISOString(),
    stripe_customer_id: meta.stripe_customer_id,
    stripe_session_id: meta.stripe_session_id,
    stripe_payment_id: meta.stripe_payment_id ?? null,
    upgraded_from: meta.upgraded_from,
  };
}

export function premiumTierAccess(meta: {
  stripe_customer_id?: string;
  stripe_session_id?: string;
  stripe_payment_id?: string | null;
  upgraded_from?: Tier;
  now?: Date;
}): CourseAccess {
  return {
    tier: "premium",
    modules: [],
    tools: [],
    premium_support: true,
    purchased_at: (meta.now ?? new Date()).toISOString(),
    stripe_customer_id: meta.stripe_customer_id,
    stripe_session_id: meta.stripe_session_id,
    stripe_payment_id: meta.stripe_payment_id ?? null,
    upgraded_from: meta.upgraded_from,
  };
}

// Robust parser: anything stored on user_profile.course_access goes through this.
// Defaults to a no-access shape if the column is null/empty/garbled.
export function parseCourseAccess(raw: unknown): CourseAccess {
  if (!raw || typeof raw !== "object") {
    return { tier: "free", modules: [], tools: [] };
  }
  const obj = raw as Record<string, unknown>;
  const tier = obj.tier === "core" || obj.tier === "premium" ? obj.tier : "free";
  const modules = Array.isArray(obj.modules)
    ? obj.modules.filter((s): s is string => typeof s === "string")
    : [];
  const tools = Array.isArray(obj.tools)
    ? obj.tools.filter((s): s is string => typeof s === "string")
    : [];
  return {
    tier,
    modules,
    tools,
    premium_support: obj.premium_support === true ? true : undefined,
    signed_up_at: typeof obj.signed_up_at === "string" ? obj.signed_up_at : undefined,
    purchased_at: typeof obj.purchased_at === "string" ? obj.purchased_at : undefined,
    stripe_customer_id:
      typeof obj.stripe_customer_id === "string" ? obj.stripe_customer_id : undefined,
    stripe_session_id:
      typeof obj.stripe_session_id === "string" ? obj.stripe_session_id : undefined,
    stripe_payment_id:
      typeof obj.stripe_payment_id === "string" ? obj.stripe_payment_id : null,
    upgraded_from:
      obj.upgraded_from === "free" ||
      obj.upgraded_from === "core" ||
      obj.upgraded_from === "premium"
        ? obj.upgraded_from
        : undefined,
  };
}

export function hasAnyAccess(access: CourseAccess): boolean {
  if (access.tier === "core" || access.tier === "premium") return true;
  return access.modules.length > 0 || access.tools.length > 0;
}

export function isPaid(access: CourseAccess): boolean {
  return access.tier === "core" || access.tier === "premium";
}

// Free pivot (Jul 24 2026): every signed-in account gets the full Blueprint.
// The only gate left is premiumOnly content (the Roadmap deliverables in
// Module 21 + intake tools), which stays tier === "premium" and is granted
// manually when Ryan approves a Roadmap application. The legacy per-item
// allowlists in course_access.modules/tools are ignored for unlocking but
// preserved in the data for history.
export function isModuleUnlocked(moduleSlug: string, access: CourseAccess): boolean {
  const mod = MODULES.find((m) => m.slug === moduleSlug);
  if (!mod) return false;
  if (mod.premiumOnly) return access.tier === "premium";
  return true;
}

export function isToolUnlocked(toolSlug: string, access: CourseAccess): boolean {
  const tool = TOOLS.find((t) => t.slug === toolSlug);
  if (!tool) return false;
  if (tool.premiumOnly) return access.tier === "premium";
  return true;
}

// Returns the price label for the tier. Used in upgrade CTAs.
export function priceLabelFor(tier: Tier): string {
  if (tier === "premium") return "Free, by application";
  return "Free";
}
