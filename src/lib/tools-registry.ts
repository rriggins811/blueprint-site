// Source of truth for all Blueprint tools.
// Tier 1 = "must ship" interactive tools per TOOLS_DECISION_MATRIX.md.

export type ToolKind = "interactive" | "pdf";

export type Tool = {
  slug: string;
  title: string;
  moduleSlug: string;
  kind: ToolKind;
  tier?: 1 | 2 | 3;
  description: string;
  componentKey?: InteractiveToolKey; // only for interactive tools
};

export type InteractiveToolKey =
  | "quick-start-7day"
  | "starting-point-assessment"
  | "transition-cost-estimator"
  | "monthly-cost-comparison"
  | "comparison-scorecard"
  | "net-proceeds"
  | "aging-cost-calculator"
  | "burnout-assessment";

export const TOOLS: Tool[] = [
  // Module 00
  {
    slug: "tool-00a",
    title: "7-Day Quick Start Checklist",
    moduleSlug: "module-00",
    kind: "interactive",
    tier: 1,
    componentKey: "quick-start-7day",
    description:
      "Your first week, day by day. Check off the small wins so the family stays moving forward.",
  },
  {
    slug: "tool-00b",
    title: "Family Sharing Letter",
    moduleSlug: "module-00",
    kind: "pdf",
    description:
      "Copy-paste email template the adult child can send to siblings to introduce the Blueprint.",
  },

  // Module 01
  {
    slug: "tool-01a",
    title: "Starting Point Assessment",
    moduleSlug: "module-01",
    kind: "interactive",
    tier: 1,
    componentKey: "starting-point-assessment",
    description:
      "Where is your family right now? Six questions, one personalized starting plan.",
  },
  {
    slug: "tool-01b",
    title: "Timeline Reality Check",
    moduleSlug: "module-01",
    kind: "interactive",
    tier: 2,
    description: "Realistic timeline for your situation.",
  },
  {
    slug: "tool-01c",
    title: "Transition Stage Readiness",
    moduleSlug: "module-01",
    kind: "interactive",
    tier: 2,
    description: "Quiz with personalized stage result.",
  },

  // Module 06
  {
    slug: "tool-06d",
    title: "Transition Cost Estimator",
    moduleSlug: "module-06",
    kind: "interactive",
    tier: 1,
    componentKey: "transition-cost-estimator",
    description:
      "Add up everything: facility deposit, monthly costs, prep work, moving, and gaps. Avoid the $50K surprise.",
  },

  // Module 07
  {
    slug: "tool-07a",
    title: "Monthly Cost Comparison",
    moduleSlug: "module-07",
    kind: "interactive",
    tier: 1,
    componentKey: "monthly-cost-comparison",
    description:
      "Side-by-side monthly cost across two or three facilities. Includes hidden line items most tours skip.",
  },
  {
    slug: "tool-07d",
    title: "Multi-Facility Comparison Scorecard",
    moduleSlug: "module-07",
    kind: "interactive",
    tier: 1,
    componentKey: "comparison-scorecard",
    description:
      "Score each facility on what actually matters. Auto-tally so you don't pick the prettiest one by accident.",
  },

  // Module 09
  {
    slug: "tool-09a",
    title: "Net Proceeds Calculator",
    moduleSlug: "module-09",
    kind: "interactive",
    tier: 1,
    componentKey: "net-proceeds",
    description:
      "Sale price minus everything that comes off the top. Know what your family actually walks away with.",
  },

  // Module 14
  {
    slug: "tool-14a",
    title: "Aging Cost Calculator",
    moduleSlug: "module-14",
    kind: "interactive",
    tier: 1,
    componentKey: "aging-cost-calculator",
    description:
      "Aging at home vs. assisted living, year by year. The math that drives the right call.",
  },

  // Module 18
  {
    slug: "tool-18a",
    title: "Caregiver Burnout Self-Assessment",
    moduleSlug: "module-18",
    kind: "interactive",
    tier: 1,
    componentKey: "burnout-assessment",
    description:
      "Twelve honest questions. A score, a read on where you are, and what to change first.",
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsForModule(moduleSlug: string): Tool[] {
  return TOOLS.filter((t) => t.moduleSlug === moduleSlug);
}
