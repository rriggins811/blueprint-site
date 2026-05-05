// Source: Blueprint Website Build/MODULE_INVENTORY.md.
// One row per dashboard module. URL pattern: /dashboard/module-XX.

export type Module = {
  slug: string;
  number: string;
  title: string;
  summary: string;
  toolCount: number;
  premiumOnly?: boolean;
};

export const MODULES: Module[] = [
  {
    slug: "module-00",
    number: "00",
    title: "Foundations and Quick Start",
    summary:
      "Welcome, the 7-day quick start, how to share with family. Sets expectations and gets the family aligned in week one.",
    toolCount: 2,
  },
  {
    slug: "module-01",
    number: "01",
    title: "Starting Point Assessment",
    summary:
      "Where you are right now, realistic timeline, what stage of transition you are actually in.",
    toolCount: 3,
  },
  {
    slug: "module-02",
    number: "02",
    title: "Sorting and Decluttering",
    summary:
      "The 5-Pile Sorting System, daily two-bag rhythm, building confidence in tough sorting decisions.",
    toolCount: 5,
  },
  {
    slug: "module-03",
    number: "03",
    title: "Paperwork System",
    summary:
      "3-Folder paperwork system, room-by-room paper sorting, tracking progress.",
    toolCount: 3,
  },
  {
    slug: "module-04",
    number: "04",
    title: "Sentimental Items and Decisions",
    summary:
      "The 3-path framework for sentimental items, picking favorites first, planning the new space.",
    toolCount: 4,
  },
  {
    slug: "module-05",
    number: "05",
    title: "Property Prep and Repairs",
    summary:
      "Smart prep budget, safety walkthrough, comparing contractor bids, prioritizing repairs.",
    toolCount: 4,
  },
  {
    slug: "module-06",
    number: "06",
    title: "Legal and Financial Foundation",
    summary:
      "Essential legal documents, financial exploitation prevention, Medicare and Medicaid eligibility, full transition cost estimation.",
    toolCount: 4,
  },
  {
    slug: "module-07",
    number: "07",
    title: "Touring and Comparing Facilities",
    summary:
      "Monthly cost comparison, the questions to ask on tours, red flags, multi-facility scorecard.",
    toolCount: 4,
  },
  {
    slug: "module-08",
    number: "08",
    title: "Asset and Estate Inventory",
    summary:
      "Estate documents to gather, digital asset inventory, full asset inventory, identifying who decides what.",
    toolCount: 4,
  },
  {
    slug: "module-09",
    number: "09",
    title: "Sale Decision Path",
    summary:
      "Net proceeds calculator, cash offer evaluation, traditional listing path, the Decision Pyramid.",
    toolCount: 4,
  },
  {
    slug: "module-10",
    number: "10",
    title: "Move Logistics",
    summary:
      "Move timeline, address change checklist, essentials box, utility transfer.",
    toolCount: 4,
  },
  {
    slug: "module-11",
    number: "11",
    title: "Closing Day",
    summary:
      "Closing day checklist, final walkthrough, post-closing tasks.",
    toolCount: 3,
  },
  {
    slug: "module-12",
    number: "12",
    title: "First 72 Hours After Move",
    summary:
      "The first 72 hours playbook, warning signs to watch for, daily check-in template, routine builder.",
    toolCount: 4,
  },
  {
    slug: "module-13",
    number: "13",
    title: "Family Dynamics",
    summary:
      "Family meeting agenda, de-escalation techniques, task division across siblings, recognizing caregiver burnout.",
    toolCount: 4,
  },
  {
    slug: "module-14",
    number: "14",
    title: "Aging in Place vs Move",
    summary:
      "Aging cost calculator, home modification cost framework, Plan B.",
    toolCount: 3,
  },
  {
    slug: "module-15",
    number: "15",
    title: "Long-Term Care Planning",
    summary:
      "LTC decision flowchart, LTC policy comparison, affordability assessment.",
    toolCount: 3,
  },
  {
    slug: "module-16",
    number: "16",
    title: "Government Benefits",
    summary:
      "Medicare coverage gaps, VA eligibility, Medicaid spend-down planning, coordinating multiple benefits.",
    toolCount: 4,
  },
  {
    slug: "module-17",
    number: "17",
    title: "Estate Planning",
    summary:
      "Trust selection framework, estate tax basics, full beneficiary audit.",
    toolCount: 3,
  },
  {
    slug: "module-18",
    number: "18",
    title: "Caregiver Self-Care",
    summary:
      "Burnout self-assessment, respite planning, caregiver information and contacts.",
    toolCount: 3,
  },
  {
    slug: "module-19",
    number: "19",
    title: "Completion",
    summary:
      "Final completion assessment, what is next, prep for ongoing work.",
    // Module 19 has only the Completion Assessment (1 tool). The two Premium
    // tools (Session Prep, Intake Form) live under module-19-premium.
    toolCount: 1,
  },
  {
    slug: "module-19-premium",
    number: "19+",
    title: "Premium Session Prep and Intake",
    summary:
      "Premium-tier exclusive content. Pre-work for the 60-minute strategy call with Ryan, plus extended frameworks.",
    toolCount: 2,
    premiumOnly: true,
  },
];
