// Source of truth for all 71 Blueprint tools.
// RAW_TOOLS is generated from the PDF source folder by
// scripts/generate-tools-registry.mjs. This file layers hand-curated
// overrides on top: which tools have an interactive React component, and
// polished descriptions for the eight Tier 1 must-ship tools.

import { RAW_TOOLS } from "./tools-registry.generated";

export type InteractiveToolKey =
  | "quick-start-7day"
  | "starting-point-assessment"
  | "transition-cost-estimator"
  | "monthly-cost-comparison"
  | "comparison-scorecard"
  | "net-proceeds"
  | "aging-cost-calculator"
  | "burnout-assessment"
  | "smart-prep-budget";

export type Tool = {
  slug: string;
  pdfName: string;
  title: string;
  moduleSlug: string;
  description: string;
  // If set, this tool also has an interactive React UI at /dashboard/tools/[slug].
  // If unset, the tool is PDF-only (download from Supabase Storage).
  componentKey?: InteractiveToolKey;
  premiumOnly?: boolean;
  // Canonical name used in course_access.tools for free-tier matching.
  // URL slugs stay tool-NNX; this is the friendly name the rest of the
  // architecture (RSS site, Make.com, marketing) refers to.
  canonicalSlug?: string;
};

// Hand-curated overrides keyed by slug.
const OVERRIDES: Record<
  string,
  Partial<Pick<Tool, "title" | "description" | "componentKey" | "premiumOnly" | "canonicalSlug">>
> = {
  // Module 00
  "tool-00a": {
    title: "7-Day Quick Start Checklist",
    description:
      "Your first week, day by day. Check off the small wins so the family stays moving forward.",
    componentKey: "quick-start-7day",
  },
  "tool-00b": {
    description:
      "Copy-paste email template the adult child can send to siblings to introduce the Blueprint.",
  },

  // Module 01
  "tool-01a": {
    title: "Starting Point Assessment",
    description:
      "Where is your family right now? Six questions, one personalized starting plan.",
    componentKey: "starting-point-assessment",
    canonicalSlug: "prepquiz",
  },
  "tool-01b": {
    description: "Realistic timeline for your situation in 5 minutes.",
  },
  "tool-01c": {
    description: "Quiz with personalized stage result.",
  },

  // Module 02
  "tool-02a": { description: "Visual reference for the 5-Pile sorting framework." },
  "tool-02a-2": { description: "Companion guide that walks through the 5-Pile system." },
  "tool-02b": { description: "Daily tracker for the two-bag rhythm. Take it room by room." },
  "tool-02c": { description: "Track which areas you have built confidence in." },
  "tool-02c-2": { description: "Printable companion checklist." },

  // Module 03
  "tool-03a": { description: "The 3-Folder paperwork system. Print and put on the desk." },
  "tool-03b": { description: "Multi-week tracker for paperwork progress." },
  "tool-03c": { description: "Long checklist, save progress room by room." },

  // Module 04
  "tool-04a": { description: "The 3-Path framework for sentimental decisions." },
  "tool-04b": { description: "How to pick the favorites first and let the rest go." },
  "tool-04c": { description: "Decision flowchart for the items you cannot let go of." },
  "tool-04d": { description: "Worksheet for measuring and planning the new space." },

  // Module 05
  "tool-05a": {
    title: "Smart Prep Budget Calculator",
    description:
      "Allocate a tight prep budget across what actually moves the needle. Put $5K to work, not $50K.",
    componentKey: "smart-prep-budget",
    canonicalSlug: "smart-prep-budget-calculator",
  },
  "tool-05b": { description: "Walk the home with this safety checklist in hand." },
  "tool-05c": { description: "Compare contractor bids side by side." },
  "tool-05d": { description: "Score and rank repairs by priority." },

  // Module 06
  "tool-06a": { description: "The essential legal documents to take to the attorney." },
  "tool-06b": { description: "Warning signs of financial exploitation." },
  "tool-06c": { description: "Eligibility quick-check for Medicare and Medicaid." },
  "tool-06d": {
    title: "Transition Cost Estimator",
    description:
      "Add up everything: facility deposit, monthly costs, prep work, moving, and gaps. Avoid the $50K surprise.",
    componentKey: "transition-cost-estimator",
  },

  // Module 07
  "tool-07a": {
    title: "Monthly Cost Comparison",
    description:
      "Side-by-side monthly cost across two facilities. Includes hidden line items most tours skip.",
    componentKey: "monthly-cost-comparison",
  },
  "tool-07b": { description: "Bring this to the tour. Ask every question." },
  "tool-07c": { description: "Red flags to watch for during a facility tour." },
  "tool-07d": {
    title: "Multi-Facility Comparison Scorecard",
    description:
      "Score each facility on what actually matters. Auto-tally so you don't pick the prettiest one by accident.",
    componentKey: "comparison-scorecard",
  },

  // Module 08
  "tool-08a": { description: "Estate documents reference list." },
  "tool-08b": { description: "Digital asset inventory worksheet." },
  "tool-08c": { description: "Full asset inventory for the family." },
  "tool-08d": { description: "Reference of who-decides-what." },

  // Module 09
  "tool-09a": {
    title: "Net Proceeds Calculator",
    description:
      "Sale price minus everything that comes off the top. Know what your family actually walks away with.",
    componentKey: "net-proceeds",
    canonicalSlug: "net-proceeds-calculator",
  },
  "tool-09b": { description: "Checklist to keep on the call with a cash buyer." },
  "tool-09c": { description: "What to expect with a traditional listing." },
  "tool-09d": { description: "Decision pyramid for choosing between sale paths." },

  // Module 10
  "tool-10a": { description: "Move timeline you can build by start date." },
  "tool-10b": { description: "Address change checklist. Print or save digitally." },
  "tool-10c": { description: "Essentials box packing list for move day." },
  "tool-10d": { description: "Utility transfer checklist for closing day." },

  // Module 11
  "tool-11a": { description: "Closing day checklist for the table." },
  "tool-11b": { description: "Final walkthrough form for the empty house." },
  "tool-11c": { description: "Quick reference for the first 30 days post-close." },

  // Module 12
  "tool-12a": { description: "First 72 hours playbook for the most underestimated stretch." },
  "tool-12b": { description: "Warning signs to watch for in a recently moved senior." },
  "tool-12c": { description: "Daily check-in template you can run for weeks." },
  "tool-12d": { description: "Build your senior's new daily routine, and adjust as you learn." },

  // Module 13
  "tool-13a": { description: "Family meeting agenda template." },
  "tool-13b": { description: "De-escalation techniques to keep close at hand." },
  "tool-13c": { description: "Divide tasks across siblings so no one does it all." },
  "tool-13d": { description: "Recognize burnout in family members before it cascades." },

  // Module 14
  "tool-14a": {
    title: "Aging Cost Calculator",
    description:
      "Aging at home vs. assisted living, year by year. The math that drives the right call.",
    componentKey: "aging-cost-calculator",
  },
  "tool-14b": { description: "Home modification cost framework." },
  "tool-14c": { description: "Reference for when Plan A stops being the plan." },

  // Module 15
  "tool-15a": { description: "LTC decision flowchart." },
  "tool-15b": { description: "Side-by-side LTC policy comparison." },
  "tool-15c": { description: "LTC affordability assessment." },

  // Module 16
  "tool-16a": { description: "Reference of Medicare coverage gaps." },
  "tool-16b": { description: "VA eligibility reference for senior benefits." },
  "tool-16c": { description: "Medicaid spend-down planning calculator." },
  "tool-16d": { description: "Coordinating Medicare, Medicaid, VA, and private benefits." },

  // Module 17
  "tool-17a": { description: "Trust selection framework. Bring to the attorney." },
  "tool-17b": { description: "Estate tax basics in plain English." },
  "tool-17c": { description: "Beneficiary audit across every account." },

  // Module 18
  "tool-18a": {
    title: "Caregiver Burnout Self-Assessment",
    description:
      "Twelve honest questions. A score, a read on where you are, and what to change first.",
    componentKey: "burnout-assessment",
  },
  "tool-18b": { description: "Plan respite before you need it." },
  "tool-18c": { description: "Caregiver information and key contacts in one place." },

  // Module 19 + 19 Premium
  "tool-19a": { description: "Final completion assessment + what is next." },
  "tool-19a-premium-session-prep": {
    description: "Premium-only prep doc for the 60-minute strategy call with Ryan.",
    premiumOnly: true,
  },
  "tool-19b-premium-intake-form": {
    description: "Premium-only intake form. Complete before the strategy call.",
    premiumOnly: true,
  },
};

// Default description if none was provided.
function defaultDescription(title: string): string {
  return `${title}. Reference document.`;
}

export const TOOLS: Tool[] = RAW_TOOLS.map((raw) => {
  const o = OVERRIDES[raw.slug] ?? {};
  return {
    slug: raw.slug,
    pdfName: raw.pdfName,
    title: o.title ?? raw.title,
    moduleSlug: raw.moduleSlug,
    description: o.description ?? defaultDescription(o.title ?? raw.title),
    componentKey: o.componentKey,
    premiumOnly: o.premiumOnly,
    canonicalSlug: o.canonicalSlug,
  };
});

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsForModule(moduleSlug: string): Tool[] {
  return TOOLS.filter((t) => t.moduleSlug === moduleSlug);
}

export function isInteractive(tool: Tool): boolean {
  return Boolean(tool.componentKey);
}
