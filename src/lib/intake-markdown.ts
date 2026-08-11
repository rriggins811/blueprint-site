/**
 * Assemble a completed intake into the "PART A" markdown the roadmap
 * generator actually consumes.
 *
 * This is the piece that makes the intake the front door to the roadmap brain.
 * Worth being precise about what the brain expects, because it is not a JSON
 * API: `GENERATOR_SYSTEM_PROMPT_v1.md` lives in a Claude Project's instructions
 * box and you paste a filled intake into a fresh chat. `TEST_Intake_Prewitt.md`
 * is the reference for the shape, and it is narrative markdown with unknowns
 * called out in bold, not key-value pairs.
 *
 * So the job here is not "serialize the row." It is to render answers as prose
 * a person could read, and to render every skip as an explicit, visible
 * unknown. The brain's rule is "skips are data, not blanks": a blank field
 * gets papered over, whereas the words "nobody has pulled the deed" become a
 * section of the plan. Emitting an empty string would silently destroy the
 * most valuable thing the form learns.
 */

import {
  INTAKE_SECTIONS,
  PROPERTY_FIELDS,
  URGENT_FIRST_FIELD,
  FLAG_CRITICAL_FIELDS,
  type IntakeField,
  type SkipState,
} from "@/lib/intake-schema";

export type IntakeRow = {
  application_id: string;
  your_info_json: Record<string, unknown>;
  senior_info_json: Record<string, unknown>;
  home_info_json: Record<string, unknown>;
  other_property_json: Record<string, unknown>;
  pressure_offers_json: Record<string, unknown>;
  financial_json: Record<string, unknown>;
  legal_json: Record<string, unknown>;
  family_dynamics_json: Record<string, unknown>;
  transition_status_json: Record<string, unknown>;
  goals_json: Record<string, unknown>;
  skips_json: Record<string, SkipState>;
  submitted_at: string | null;
  completed_at: string | null;
};

export type ApplicationRow = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  state: string;
};

/** How a skip reads in the document. Phrased so the brain sees a live gap. */
const SKIP_PROSE: Record<SkipState, string> = {
  dont_know: "**Unknown, the family does not know.**",
  not_applicable: "Not applicable.",
  skipped: "**Not answered on the form.**",
};

/** Labels are written as questions; a trailing "?" plus ":" reads badly. */
function labelFor(field: IntakeField): string {
  return field.label.replace(/\?$/, "");
}

function fmtValue(field: IntakeField, raw: unknown): string {
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "";
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (field.type === "currency") {
    const n = Number(s.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? `$${n.toLocaleString()}` : s;
  }
  if (field.type === "scale") return `${s} of 5`;
  return s;
}

/** One line per field, with skips rendered rather than dropped. */
function renderField(
  field: IntakeField,
  data: Record<string, unknown>,
  skips: Record<string, SkipState>
): string | null {
  const skip = skips[field.name];
  if (skip) {
    const flag = FLAG_CRITICAL_FIELDS.includes(field.name) ? " (flag)" : "";
    return `- **${labelFor(field)}${flag}:** ${SKIP_PROSE[skip]}`;
  }
  const value = fmtValue(field, data[field.name]);
  if (!value) return null; // never touched and never explicitly skipped
  const detail = String(data[`${field.name}__detail`] ?? "").trim();
  // Build the sentence directly rather than post-processing it. An earlier
  // version joined with a separator and then string-replaced it, which would
  // have corrupted any answer a family wrote containing that same separator.
  const body = detail ? `${value}. ${detail}` : value;
  return `- **${labelFor(field)}:** ${body}`;
}

function renderProperties(other: Record<string, unknown>, skips: Record<string, SkipState>): string[] {
  const list = Array.isArray(other.properties) ? (other.properties as Record<string, unknown>[]) : [];
  if (!list.length) return [];
  return list.flatMap((prop, i) => {
    const lines = PROPERTY_FIELDS.map((f) => {
      // Property skips are namespaced so two properties can differ.
      const scoped = { ...skips, [f.name]: skips[`properties.${i}.${f.name}`] } as Record<
        string,
        SkipState
      >;
      return renderField(f, prop, scoped);
    }).filter(Boolean) as string[];
    return lines.length ? [``, `**Property ${i + 1}**`, ...lines] : [];
  });
}

export function buildIntakeMarkdown(args: {
  application: ApplicationRow;
  intake: IntakeRow;
}): string {
  const { application, intake } = args;
  const skips = intake.skips_json ?? {};
  const who = `${application.first_name} ${application.last_name}`.trim();
  const complete = Boolean(intake.completed_at);

  const out: string[] = [];
  out.push(`# ROADMAP INTAKE — ${who}`);
  out.push(
    `**${complete ? "Completed" : "Partial"} intake submitted ${
      intake.submitted_at ? new Date(intake.submitted_at).toISOString().slice(0, 10) : "(not submitted)"
    }. Part A only. Draft the roadmap from this.**`
  );
  out.push("");
  out.push(
    complete
      ? "The family worked all the way through. Unknowns below are real unknowns, not laziness."
      : "**This intake is partial. The family stopped partway through.** Everything not answered is marked. Treat the gaps as gaps, not as absences of a problem."
  );
  out.push("");
  out.push("---");
  out.push("");
  out.push("## PART A — Intake answers (as captured)");
  out.push("");
  out.push("### Applicant of record");
  out.push(`- **Name:** ${who}`);
  out.push(`- **Email:** ${application.email}`);
  out.push(`- **Phone:** ${application.phone}`);
  out.push(`- **State:** ${application.state}`);

  // The hoisted urgency question leads, because if the answer is yes it
  // changes the whole shape of the roadmap.
  const urgentLine = renderField(URGENT_FIRST_FIELD, intake.pressure_offers_json ?? {}, skips);
  if (urgentLine) {
    out.push("");
    out.push("### Anything signed, or a contract in front of them now");
    out.push(urgentLine);
  }

  const columnMap: Record<string, Record<string, unknown>> = {
    your_info_json: intake.your_info_json ?? {},
    senior_info_json: intake.senior_info_json ?? {},
    home_info_json: intake.home_info_json ?? {},
    other_property_json: intake.other_property_json ?? {},
    pressure_offers_json: intake.pressure_offers_json ?? {},
    financial_json: intake.financial_json ?? {},
    legal_json: intake.legal_json ?? {},
    family_dynamics_json: intake.family_dynamics_json ?? {},
    transition_status_json: intake.transition_status_json ?? {},
    goals_json: intake.goals_json ?? {},
  };

  INTAKE_SECTIONS.forEach((section, idx) => {
    const data = columnMap[section.column] ?? {};
    const lines = section.fields
      .map((f) => renderField(f, data, skips))
      .filter(Boolean) as string[];

    if (section.key === "other_property") {
      lines.push(...renderProperties(data, skips));
    }

    if (!lines.length) {
      out.push("");
      out.push(`### ${idx + 1}. ${section.title}`);
      out.push("**Nothing captured in this section.**");
      return;
    }
    out.push("");
    out.push(`### ${idx + 1}. ${section.title}`);
    out.push(...lines);
  });

  // An explicit roll-up so the brain does not have to hunt for the flags, and
  // so Ryan can see at a glance what the call has to nail down.
  // Match namespaced property keys (properties.0.titled_to) as well as bare
  // field names. Without this the per-property flags render inside the
  // property block but never reach the roll-up, and "an owner is deceased and
  // the estate was never opened" is the one flag least affordable to lose.
  const flagged = Object.keys(skips).filter((key) => {
    const bare = key.includes(".") ? (key.split(".").pop() as string) : key;
    return FLAG_CRITICAL_FIELDS.includes(bare);
  });
  out.push("");
  out.push("---");
  out.push("");
  out.push("## Flag-critical unknowns");
  if (!flagged.length) {
    out.push("None. Every flag-critical field was answered.");
  } else {
    out.push(
      "These are the flag-critical fields the family could not answer. Each one is a live gap the roadmap has to address, and the first thing to nail down."
    );
    out.push("");
    const describe = (key: string): string => {
      const parts = key.split(".");
      const bare = parts[parts.length - 1];
      const prefix =
        parts.length === 3 && parts[0] === "properties"
          ? `Property ${Number(parts[1]) + 1}: `
          : "";
      for (const s of INTAKE_SECTIONS) {
        const f = s.fields.find((x) => x.name === bare);
        if (f) return `${prefix}${f.label}`;
      }
      const p = PROPERTY_FIELDS.find((x) => x.name === bare);
      if (p) return `${prefix}${p.label}`;
      return bare === URGENT_FIRST_FIELD.name ? URGENT_FIRST_FIELD.label : bare;
    };
    flagged.forEach((key) => {
      out.push(`- **${describe(key)}** ${SKIP_PROSE[skips[key]]}`);
    });
  }

  return out.join("\n");
}
