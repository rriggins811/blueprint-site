// Book-reader attribution (Oct 5 2026).
//
// The Senior Transition (Ryan's book) prints short links like
// rigginsstrategicsolutions.com/book/blueprint. Those forward with
// utm_source=book&utm_content=<link name>, and rss-site now carries the utm
// params onto every link into this site. The signup and Roadmap forms echo
// them back as hidden fields, and the actions use this file to give the GHL
// contact a `book-reader` tag plus `book-link-<name>`, matching the tags
// rss-site's own lead routes add.

import { upsertGhlContact, addTagsToGhlContact } from "@/lib/ghl-proxy";

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

/** Tags implied by a form's echoed utm fields. Empty unless utm_source=book. */
export function bookTagsFromForm(formData: FormData): string[] {
  if (String(formData.get("utm_source") ?? "") !== "book") return [];
  const tags = ["book-reader"];
  const content = String(formData.get("utm_content") ?? "")
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 40)
    .toLowerCase();
  if (content) tags.push(`book-link-${content}`);
  return tags;
}

/**
 * Add the book tags to the contact without touching any other tag. Upsert by
 * email first (no tags in the body, so nothing else changes), then add.
 */
export async function tagBookReader(
  email: string,
  firstName: string | undefined,
  tags: readonly string[]
): Promise<void> {
  if (tags.length === 0) return;
  try {
    const up = await upsertGhlContact({ email, firstName });
    if (!up.ok) {
      console.error(`[book-attribution] upsert failed for ${email}: ${up.error}`);
      return;
    }
    const res = await addTagsToGhlContact(up.contactId, tags);
    if (!res.ok) {
      console.error(`[book-attribution] tag failed for ${email}: ${res.error}`);
    }
  } catch (err) {
    console.error(
      `[book-attribution] threw for ${email}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
