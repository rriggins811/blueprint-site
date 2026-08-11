/**
 * The Roadmap intake, canonical field list.
 *
 * Transcribed from `RECONCILED_INTAKE_SCHEMA_v1.md` (Aug 8 2026), which is the
 * single source of truth and itself a merge of the polished
 * `RSS_PreConsultation_Intake_Form.pdf` with the older tool JSON. Wording is
 * kept close to the source on purpose: several questions do legal or financial
 * precision work (capacity, titling, Medicaid notices) and paraphrasing them
 * loses that.
 *
 * Two rules drive the shape of this file:
 *
 *   1. EVERY field is skippable. Identity is already known from the
 *      application, so nothing here is required at all.
 *   2. A skip is data. On flag-critical fields a family can say "I don't know"
 *      or "not applicable" explicitly, and both are recorded. "Don't know if
 *      there's a POA" is the single most valuable thing this form can learn,
 *      so it must never land in the database as an empty string.
 */

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "currency"
  | "phone"
  | "email"
  | "date"
  | "select"
  | "multiselect"
  | "scale";

export type IntakeField = {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** Shown under the label. Use for the "why we ask" nudge. */
  help?: string;
  /**
   * Flag-critical per the reconciled schema. These render the explicit
   * "I don't know" / "Not applicable" buttons, and an unknown here becomes a
   * flag the roadmap has to address rather than a gap it papers over.
   */
  flagCritical?: boolean;
  /** Free-text follow-up shown when the answer is one of these options. */
  detailWhen?: string[];
  detailLabel?: string;
};

export type IntakeSection = {
  /** Column on roadmap_intake, e.g. your_info_json. */
  column: string;
  key: string;
  title: string;
  /** One line under the heading. Sets expectation and lowers the stakes. */
  blurb: string;
  fields: IntakeField[];
};

/** The three states a family can choose instead of answering. */
export const SKIP_STATES = ["dont_know", "not_applicable", "skipped"] as const;
export type SkipState = (typeof SKIP_STATES)[number];

export const SKIP_LABELS: Record<SkipState, string> = {
  dont_know: "I don't know",
  not_applicable: "Not applicable",
  skipped: "Not answered",
};

/**
 * The one question worth having from someone who gives us thirty seconds.
 *
 * The reconciled schema puts Pressure and Offers at section 5 and Legal at 7,
 * which means a family that abandons after screen 3 leaves nothing
 * flag-critical behind. Abandonment is the spec's own stated primary risk, so
 * the single highest-urgency question is hoisted onto screen 1 while the
 * canonical section order is preserved for everyone who finishes.
 */
export const URGENT_FIRST_FIELD: IntakeField = {
  name: "signed_anything_or_contract_in_front_of_you_now",
  label:
    "Has anyone asked your parent to sign something, or is there a contract in front of you right now?",
  type: "select",
  options: ["No", "Yes"],
  help: "If the answer is yes, say so here and stop filling out the rest. Ryan will call you.",
  flagCritical: true,
  detailWhen: ["Yes"],
  detailLabel: "What was signed or what is in front of you?",
};

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    column: "your_info_json",
    key: "you",
    title: "You",
    blurb: "We already have most of this from your application. Correct anything that is off.",
    fields: [
      { name: "your_name", label: "Your name", type: "text" },
      { name: "preferred_name", label: "What should Ryan call you?", type: "text" },
      {
        name: "relationship_to_senior",
        label: "Your relationship to the senior",
        type: "select",
        options: ["Son", "Daughter", "Spouse", "Other"],
      },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "email", label: "Email", type: "email" },
      { name: "city_state", label: "Your city and state", type: "text" },
      {
        name: "best_way_and_time_to_reach",
        label: "Best way and time to reach you",
        type: "text",
        help: "Call, text, email, and the hours that actually work.",
      },
    ],
  },
  {
    column: "senior_info_json",
    key: "senior",
    title: "The Senior",
    blurb: "Who this is for, and how they are doing right now.",
    fields: [
      { name: "name", label: "Their name", type: "text" },
      { name: "age", label: "Age", type: "number" },
      { name: "gender", label: "Gender", type: "text" },
      {
        name: "current_living_situation",
        label: "Where they live now",
        type: "select",
        options: ["Own home", "Renting", "With family", "Senior community", "Other"],
      },
      { name: "current_city_state", label: "Their city and state", type: "text" },
      { name: "lives_alone", label: "Do they live alone?", type: "select", options: ["Yes", "No"] },
      { name: "lives_with", label: "If not, who lives with them?", type: "text" },
      { name: "health_conditions", label: "Health conditions", type: "longtext" },
      {
        name: "cognitive_status",
        label: "Memory and thinking",
        type: "select",
        options: ["Sharp", "Mild decline", "Moderate decline", "Dementia or Alzheimer's"],
      },
      {
        name: "mobility",
        label: "Getting around",
        type: "select",
        options: ["Independent", "Cane or walker", "Wheelchair", "Mostly bedbound"],
      },
      {
        name: "daily_activity_help",
        label: "Help needed with daily activities",
        type: "select",
        options: ["None", "Some", "Significant", "24/7 care needed"],
      },
      {
        name: "recent_falls",
        label: "Any recent falls?",
        type: "select",
        options: ["No", "Yes"],
        detailWhen: ["Yes"],
        detailLabel: "When, and what happened?",
      },
      {
        name: "recent_hospitalizations",
        label: "Recent hospitalizations",
        type: "select",
        options: ["None", "One", "Two or more"],
        detailWhen: ["One", "Two or more"],
        detailLabel: "Details",
      },
      { name: "still_driving", label: "Still driving?", type: "select", options: ["Yes", "Limited", "No"] },
      {
        name: "manages_own_medications",
        label: "Manages their own medications?",
        type: "select",
        options: ["Yes", "With help", "No"],
      },
      {
        name: "care_in_place_now",
        label: "Any care already in place",
        type: "longtext",
        help: "In-home help, aides, meal service, adult day care.",
      },
      {
        name: "other_senior_in_the_picture",
        label: "Is there another senior, or an owner who has died, whose situation affects this?",
        type: "select",
        options: ["No", "Yes"],
        help: "A second parent in care, or someone who died with property still in their name.",
        flagCritical: true,
        detailWhen: ["Yes"],
        detailLabel: "Who, and what is their situation?",
      },
    ],
  },
  {
    column: "home_info_json",
    key: "home",
    title: "The Home",
    blurb: "The house itself. Estimates are fine, nobody expects exact numbers.",
    fields: [
      {
        name: "ownership",
        label: "Ownership",
        type: "select",
        options: ["Own paid off", "Own with a mortgage", "Own with a HELOC", "Rent"],
      },
      { name: "estimated_value", label: "Estimated value", type: "currency" },
      { name: "mortgage_owed", label: "Mortgage owed", type: "currency" },
      { name: "heloc_balance", label: "HELOC balance", type: "currency" },
      {
        name: "home_type",
        label: "Type of home",
        type: "select",
        options: ["Single family", "Condo or townhome", "Manufactured", "Other"],
      },
      { name: "square_feet", label: "Square feet", type: "number" },
      { name: "bedrooms", label: "Bedrooms", type: "number" },
      { name: "bathrooms", label: "Bathrooms", type: "number" },
      { name: "year_built", label: "Year built", type: "number" },
      { name: "roof_age", label: "Roof age", type: "text" },
      { name: "hvac_age", label: "HVAC age", type: "text" },
      {
        name: "overall_condition",
        label: "Overall condition",
        type: "select",
        options: ["Move-in ready", "Cosmetic work", "Moderate repairs", "Major work"],
      },
      {
        name: "kitchen_and_baths",
        label: "Kitchen and baths",
        type: "select",
        options: ["Updated", "Dated or original"],
      },
      {
        name: "estimated_repairs_and_known_issues",
        label: "Known issues or repairs needed",
        type: "longtext",
        help: "Roof, foundation, insurance problems, fire zone, anything a buyer would find.",
      },
      {
        name: "deed_name_and_title",
        label: "Whose name is on the deed, and how is it titled?",
        type: "longtext",
        help: "Individual, joint, trust. If nobody has pulled the deed, say so, that is useful.",
        flagCritical: true,
      },
      {
        name: "recent_appraisal_or_cma",
        label: "Any recent appraisal or agent price opinion?",
        type: "select",
        options: ["No", "Yes"],
        detailWhen: ["Yes"],
        detailLabel: "What value, and when?",
      },
    ],
  },
  {
    column: "other_property_json",
    key: "other_property",
    title: "Other Property",
    blurb: "Rentals, land, cabins, timeshares. This is where money most often gets stuck.",
    fields: [
      {
        name: "owns_other_real_estate",
        label: "Any real estate besides the home?",
        type: "select",
        options: ["No", "Yes"],
      },
      // `properties` is a repeatable group, handled by the form rather than a
      // single field. Each entry carries its own title question, because a
      // property titled to someone deceased is the flag that matters most.
    ],
  },
  {
    column: "pressure_offers_json",
    key: "pressure",
    title: "Pressure and Offers",
    blurb: "Who has been circling. Straight answers here protect your parent.",
    fields: [
      {
        name: "received_we_buy_houses_or_cash_offers",
        label: "Any “we buy houses” letters or cash offers?",
        type: "select",
        options: ["No", "A few", "A lot"],
        flagCritical: true,
      },
      {
        name: "anyone_pushed_for_fast_sale_or_signature",
        label: "Has anyone pushed for a fast sale or a signature?",
        type: "select",
        options: ["No", "Yes"],
        flagCritical: true,
        detailWhen: ["Yes"],
        detailLabel: "Describe what happened",
      },
      {
        name: "real_estate_agent_already_involved",
        label: "Is a real estate agent already involved?",
        type: "select",
        options: ["No", "Yes"],
        detailWhen: ["Yes"],
        detailLabel: "Who, and how did they come in?",
      },
    ],
  },
  {
    column: "financial_json",
    key: "financial",
    title: "Money and Benefits",
    blurb: "Ballpark is fine. This drives what options are actually open to you.",
    fields: [
      {
        name: "monthly_income_and_source",
        label: "Monthly income and where it comes from",
        type: "longtext",
        help: "Social Security, pension, survivor benefit, rental income, other.",
      },
      { name: "savings_and_investments_total", label: "Savings and investments, total", type: "currency" },
      { name: "monthly_expenses", label: "Monthly expenses", type: "currency" },
      {
        name: "ltc_insurance",
        label: "Long-term care insurance?",
        type: "select",
        options: ["No", "Yes"],
        detailWhen: ["Yes"],
        detailLabel: "Monthly benefit, if you know it",
      },
      {
        name: "va_eligibility",
        label: "Any VA eligibility?",
        type: "select",
        options: ["Yes, veteran", "Yes, surviving spouse", "No", "Unsure"],
      },
      {
        name: "medicaid_likely_needed",
        label: "Is Medicaid likely to be needed?",
        type: "select",
        options: ["Within 2 years", "In 3 to 5 years", "Unlikely", "Unsure"],
        flagCritical: true,
      },
      {
        name: "medicaid_or_estate_recovery_notices",
        label: "Any Medicaid or estate-recovery notices received?",
        type: "select",
        options: ["No", "Yes"],
        flagCritical: true,
        detailWhen: ["Yes"],
        detailLabel: "What did it say, and when did it arrive?",
      },
      { name: "who_handles_finances", label: "Who handles the day-to-day finances?", type: "text" },
    ],
  },
  {
    column: "legal_json",
    key: "legal",
    title: "Legal and Documents",
    blurb: "If you are not sure, say you are not sure. That answer is worth more than a guess.",
    fields: [
      {
        name: "financial_poa",
        label: "Financial power of attorney",
        type: "select",
        options: ["Yes", "No", "Outdated"],
        flagCritical: true,
      },
      {
        name: "healthcare_poa",
        label: "Healthcare power of attorney",
        type: "select",
        options: ["Yes", "No", "Outdated"],
        flagCritical: true,
      },
      { name: "hipaa_release", label: "HIPAA release", type: "select", options: ["Yes", "No", "Unsure"] },
      {
        name: "will_or_trust",
        label: "Will or trust",
        type: "select",
        options: ["Will", "Revocable trust", "Irrevocable trust", "None", "Outdated"],
        flagCritical: true,
      },
      {
        name: "executor_or_trustee_named",
        label: "Is an executor or trustee named?",
        type: "select",
        options: ["Yes", "No"],
        flagCritical: true,
        detailWhen: ["Yes"],
        detailLabel: "Who?",
      },
      {
        name: "elder_law_attorney",
        label: "Elder law attorney involved?",
        type: "select",
        options: ["Yes", "No", "Searching"],
      },
      {
        name: "capacity_concern",
        label: "Any concern about their capacity to sign documents?",
        type: "select",
        options: ["No", "Yes"],
        flagCritical: true,
        detailWhen: ["Yes"],
        detailLabel: "Explain what you are seeing",
      },
    ],
  },
  {
    column: "family_dynamics_json",
    key: "family",
    title: "Family and Roles",
    blurb: "Who is involved, and how well everyone is getting along.",
    fields: [
      {
        name: "adult_children_involved_and_out_of_state",
        label: "Adult children involved",
        type: "longtext",
        help: "How many, and whether any are out of state and where.",
      },
      { name: "primary_caregiver_and_location", label: "Primary caregiver, and where they live", type: "text" },
      {
        name: "family_alignment",
        label: "How aligned is the family?",
        type: "scale",
        help: "1 is pulling apart, 5 is fully united.",
      },
      {
        name: "family_conflict",
        label: "Any family conflict?",
        type: "select",
        options: ["None", "Minor", "Significant", "Major"],
      },
      {
        name: "senior_willingness",
        label: "How does the senior feel about a move?",
        type: "select",
        options: ["Willing", "Reluctant", "Resistant", "Refuses"],
      },
    ],
  },
  {
    column: "transition_status_json",
    key: "transition",
    title: "The Transition",
    blurb: "Where you are in this, and what is driving the clock.",
    fields: [
      {
        name: "where_are_you",
        label: "Where are you right now?",
        type: "select",
        options: ["Planning ahead, 1 to 5+ years", "Getting close, 3 to 12 months", "Urgent, 0 to 3 months"],
      },
      {
        name: "what_is_forcing_the_timeline",
        label: "What is forcing the timeline?",
        type: "longtext",
        help: "A fall, a diagnosis, money, a deadline, or nothing yet.",
      },
      {
        name: "preferred_direction",
        label: "Direction you are leaning",
        type: "select",
        options: [
          "Independent living",
          "Assisted living",
          "Memory care",
          "Move in with family",
          "Age in place",
          "Unsure",
        ],
      },
      { name: "target_move_date", label: "Target move date", type: "date" },
      {
        name: "home_sale_leaning",
        label: "On the house, you are leaning toward",
        type: "select",
        options: ["Traditional sale", "As-is cash", "Hybrid", "Undecided"],
      },
      { name: "options_weighing_now", label: "Options you are weighing right now", type: "longtext" },
    ],
  },
  {
    column: "goals_json",
    key: "goals",
    title: "Your Goals and What Matters Most",
    blurb: "Last one. This is the part Ryan reads first.",
    fields: [
      { name: "number_1_goal", label: "Your number one goal", type: "longtext" },
      { name: "biggest_fear", label: "Your biggest fear in all this", type: "longtext" },
      {
        name: "what_matters_most",
        label: "What matters most",
        type: "multiselect",
        options: [
          "Staying independent",
          "Being near family",
          "Leaving an inheritance",
          "Not being a burden",
          "Keeping costs down",
          "Peace of mind",
          "Other",
        ],
      },
      { name: "anything_else", label: "Anything else Ryan should know", type: "longtext" },
    ],
  },
];

/** Fields on a single entry in the repeatable Other Property group. */
export const PROPERTY_FIELDS: IntakeField[] = [
  { name: "type", label: "Type", type: "text", help: "Rental, land, cabin, second home, timeshare." },
  { name: "location", label: "Location", type: "text" },
  { name: "paid_off_or_owed", label: "Paid off, or how much is owed?", type: "text" },
  { name: "income_it_brings", label: "Income it brings in", type: "text" },
  { name: "condition", label: "Condition", type: "text" },
  {
    name: "titled_to",
    label: "Who is it titled to?",
    type: "text",
    flagCritical: true,
  },
  {
    name: "owner_deceased_or_estate_unopened",
    label: "Is an owner deceased, or is an estate unopened?",
    type: "select",
    options: ["No", "Yes", "Unsure"],
    help: "This is where the biggest money gets trapped, so it is worth a guess if you are not certain.",
    flagCritical: true,
    detailWhen: ["Yes", "Unsure"],
    detailLabel: "What do you know about it?",
  },
  {
    name: "thoughts_or_plans",
    label: "Thoughts or plans for it",
    type: "select",
    options: ["Keep", "Sell", "Unsure"],
    detailWhen: ["Keep", "Sell", "Unsure"],
    detailLabel: "Anything else about this one",
  },
  {
    name: "is_primary_residence",
    label: "Is this the primary residence?",
    type: "select",
    options: ["No", "Yes"],
    help: "Only one property can be, and it decides how capital gains work.",
  },
];

/** Every flag-critical field name, for the skip-flag summary Ryan reads. */
export const FLAG_CRITICAL_FIELDS: string[] = [
  URGENT_FIRST_FIELD.name,
  ...INTAKE_SECTIONS.flatMap((s) => s.fields.filter((f) => f.flagCritical).map((f) => f.name)),
  ...PROPERTY_FIELDS.filter((f) => f.flagCritical).map((f) => f.name),
];

export const TOTAL_SECTIONS = INTAKE_SECTIONS.length;
