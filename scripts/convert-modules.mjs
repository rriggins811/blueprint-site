#!/usr/bin/env node
// Converts the 21 Blueprint module .docx files to MDX.
// Usage: node scripts/convert-modules.mjs
//
// Source structure of each docx:
//   __MODULE N__           ← bold paragraph
//   __Title goes here__    ← bold paragraph (use as title)
//   Senior Transition Blueprint ... (subtitle line)
//   *GHL-Ready Copy ...*   (italic, dev note)
//   # TOOLS ASSESSMENT — Module N   ← H1 dev section, drop everything from here
//   ...dev paragraphs about tools...
//   __GHL LESSON 1: Lesson Title__  ← actual lessons start here, bold paragraph
//
// We treat "GHL LESSON N: Title" lines as the canonical lesson H2.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

const SOURCE_DIR =
  "/Users/rigginsstrategicsolutions/Library/CloudStorage/OneDrive-Personal/Documents/RSS - Running The Business (chat folder)/Running the business/Running the business/Blueprint Re-Write V.2 3-11-26";

const OUT_DIR = path.join(process.cwd(), "content", "modules");

const FILE_TO_SLUG = (filename) => {
  if (filename === "Module_19_Premium_GHL_Ready.docx") return "module-19-premium";
  const m = filename.match(/Module_(\d{2})_Rewrite_GHL_Ready\.docx/);
  return m ? `module-${m[1]}` : null;
};

// Unescape mammoth's over-zealous markdown escaping for plain punctuation.
// Mammoth escapes punctuation everywhere "to be safe" but it makes prose ugly.
function unescapePunctuation(md) {
  return md.replace(/\\([().\-!?'"+&%$#@:;])/g, "$1");
}

// Mammoth emits bold as `__text __` with a stray space before the closing
// underscores when the run ends mid-paragraph. That space breaks tight
// markdown bold parsing, leaving literal underscores in the output.
// Convert all `__...__` to `**...**` and strip inner edge whitespace.
function normalizeBold(md) {
  return md.replace(/__\s*([^_\n]+?)\s*__/g, "**$1**");
}

// When a bold paragraph is immediately followed by an italic phrase with no
// space between (e.g. `**RYAN'S REAL TALK:***My dad...*`) the three stars
// confuse renderers. Insert a space so the bold closes cleanly before the italic.
function fixBoldItalicCollision(md) {
  return md.replace(/\*\*\*(?=[A-Za-z0-9])/g, "** *");
}

// `**X:**Word` (no space between bold-close and the next word) leaves literal
// asterisks in the rendered output for some markdown configurations. Add a
// space so the bold parses cleanly and the prose flows.
function fixBoldNoSpaceAfter(md) {
  return md.replace(/(\*\*[^*\n]+\*\*)(?=[A-Za-z0-9])/g, "$1 ");
}

// Source-level corrections Ryan flagged. Rerunning the converter applies all
// of these in one pass, so future re-conversions don't have to be hand-fixed.
// See BLUEPRINT_MODULE_UPDATES_NEEDED.md for the rationale.
function applyContentCorrections(md) {
  let out = md;

  // 1. Ryan's book name correction.
  out = out.replace(/The Other Side of the Deal/g, "The Other Side of the Conversation");

  // 2. Outdated domain (every module 01-20 + module 00 had this in the
  //    "WANT HANDS-ON GUIDANCE?" footer block).
  out = out.replace(
    /seniortransitionblueprint\.com/gi,
    "rigginsstrategicsolutions.com/blueprint"
  );

  // 3. Module count (architecture is 21, source said 19 in many places).
  out = out
    .replace(/\ball 19 modules\b/gi, "all 21 modules")
    .replace(/\bnineteen modules\b/gi, "twenty-one modules")
    .replace(/\b19 modules\b/g, "21 modules");

  // 4. Tool count (architecture is 71, source said 90+, "over 90", or 93).
  out = out
    .replace(/\b93 downloadable tools\b/gi, "71 downloadable tools")
    .replace(/\bover 90 downloadable tools\b/gi, "71 downloadable tools")
    .replace(/\b90\+\s*downloadable tools\b/gi, "71 downloadable tools")
    .replace(/\bover 90 tools\b/gi, "71 tools")
    .replace(/\b90\+\s*tools\b/gi, "71 tools")
    .replace(/\b90\+\s*ready-to-use tools\b/gi, "71 ready-to-use tools");

  // 5. SeniorSafe pricing paragraph.
  // Source described the old "Free / $14.99 Premium" model with a few
  // trailing sentences about SMS alerts and the app store link. Replace
  // the entire run with the new tiered language. The pattern matches
  // from the SeniorSafe header through the trailing "app.seniorsafeapp.com."
  // closing line to wipe stale sentences in one shot.
  out = out.replace(
    /SeniorSafe App[^.]*?Free\s*\/\s*\$14\.99 per month Premium[\s\S]*?Download at app\.seniorsafeapp\.com\.\s*/gi,
    "SeniorSafe App (14 days free trial): Daily check-ins, medication tracking, document vault, emergency info card, AI assistant, and family coordination. Start with 14 days free, no credit card required. After trial: $14.99/mo Premium or $39.99/mo Premium+ (adds Maggie, the AI specialist for adult children running point on a parent's transition). seniorsafeapp.com "
  );

  // 6. Em dash purge per Ryan's voice rules. Replace U+2014 with " - ",
  //    collapsing any surrounding whitespace so we don't end up with double spaces.
  out = out.replace(/\s*—\s*/g, " - ");

  return out;
}

function cleanMarkdown(md) {
  return md
    .replace(/​/g, "")        // strip zero-width space
    .replace(/\r\n/g, "\n");
}

// Walk paragraphs (blank-line separated) and clean up for the public lesson.
function rewriteContent(md) {
  // Split on blank lines, keeping non-empty paragraphs.
  const paragraphs = md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  let title = null;
  let subtitle = null;
  const lessonChunks = [];
  let phase = "frontmatter"; // frontmatter → dev → lessons
  let i = 0;

  // Phase 1: walk frontmatter and capture title/subtitle (first two bold paragraphs).
  // Then look for the dev TOOLS ASSESSMENT section and skip it.
  for (; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // GHL Lesson marker means we're past dev junk and into real content.
    // After normalizeBold, the marker is `**GHL LESSON N: Title**`.
    if (/^\*\*GHL LESSON\s+\d+/i.test(p)) {
      phase = "lessons";
      break;
    }

    // Italic GHL-Ready Copy header — drop.
    if (/^\*GHL-Ready Copy[\s\S]*\*$/i.test(p)) continue;

    // H1 TOOLS ASSESSMENT — enter dev phase, skip until lessons start.
    if (/^#\s+TOOLS ASSESSMENT/i.test(p)) {
      phase = "dev";
      continue;
    }

    // In frontmatter phase, capture title/subtitle from bold paragraphs.
    if (phase === "frontmatter") {
      const boldOnly = p.match(/^\*\*(.+)\*\*$/);
      if (boldOnly) {
        const text = boldOnly[1].trim();
        if (!title) {
          // First bold = "MODULE N" — skip.
          if (/^MODULE\s+\d+/i.test(text)) continue;
          title = text;
        } else if (!subtitle) {
          subtitle = text;
        }
        continue;
      }
      // Non-bold paragraph in frontmatter (subtitle line "Senior Transition Blueprint — RSS")
      if (!subtitle && /Riggins Strategic Solutions/i.test(p)) {
        subtitle = p;
      }
    }
    // In dev phase, drop everything until we hit a lesson marker (handled at top of loop).
  }

  // Phase 2: from i onward, paragraphs are the lessons. Walk them.
  for (; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // Convert "**GHL LESSON N: Title**" to "## Title" (post-normalizeBold).
    const lessonMatch = p.match(/^\*\*GHL LESSON\s+\d+:\s*(.+?)\*\*$/i);
    if (lessonMatch) {
      lessonChunks.push(`## ${lessonMatch[1].trim()}`);
      continue;
    }

    // Convert "__RYAN'S REAL TALK: ..." style bold callouts into a callout heading + body.
    // Actually keep them as-is (bold paragraph) so the prose voice is preserved.
    lessonChunks.push(p);
  }

  return {
    title: title || "Untitled module",
    subtitle: subtitle || null,
    body: lessonChunks.join("\n\n"),
  };
}

function frontmatter({ slug, title, subtitle }) {
  const lines = [
    "---",
    `slug: "${slug}"`,
    `title: ${JSON.stringify(title)}`,
  ];
  if (subtitle) lines.push(`subtitle: ${JSON.stringify(subtitle)}`);
  lines.push(`convertedAt: "${new Date().toISOString()}"`);
  lines.push("---");
  lines.push("", "");
  return lines.join("\n");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(SOURCE_DIR))
    .filter((f) => f.endsWith(".docx") && f.startsWith("Module_"))
    .sort();

  console.log(`Found ${files.length} docx files. Output dir: ${OUT_DIR}\n`);

  for (const filename of files) {
    const slug = FILE_TO_SLUG(filename);
    if (!slug) continue;

    const buffer = await readFile(path.join(SOURCE_DIR, filename));
    const { value: rawMd } = await mammoth.convertToMarkdown({ buffer });
    const cleaned = applyContentCorrections(
      fixBoldNoSpaceAfter(
        fixBoldItalicCollision(
          normalizeBold(unescapePunctuation(cleanMarkdown(rawMd)))
        )
      )
    );
    const { title, subtitle, body } = rewriteContent(cleaned);

    const out = frontmatter({ slug, title, subtitle }) + body + "\n";
    const outPath = path.join(OUT_DIR, `${slug}.mdx`);
    await writeFile(outPath, out);

    console.log(
      `  ✓ ${slug.padEnd(20)} ${out.length.toString().padStart(6)}b  "${title.slice(0, 70)}${title.length > 70 ? "…" : ""}"`
    );
  }

  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
