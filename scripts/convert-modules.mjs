#!/usr/bin/env node
// Converts the 21 Blueprint module .docx files to MDX.
// Usage: node scripts/convert-modules.mjs
//
// Source: the July 2026 content pass in 7:1:26-Re-writes/. Each module has a
// _Cleaned_ file and sometimes a _BEEFED_ file; BEEFED is the keeper when both
// exist. Structure of each docx:
//   __MODULE N__               ← bold paragraph
//   __Title goes here__        ← bold paragraph (use as title)
//   Senior Transition Blueprint, Riggins Strategic Solutions   ← subtitle line
//   __Section Heading__        ← short full-bold paragraphs are section headings
//   prose...                   (long full-bold paragraphs are emphasis, keep bold)
//   __IMPORTANT DISCLAIMER: __ ... ← keep, never strip
//
// Heading heuristic: a full-bold paragraph becomes "## " when it is short
// (<= 70 chars) and does not end in sentence punctuation.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

const SOURCE_DIR =
  "/Users/rigginsstrategicsolutions/Library/CloudStorage/OneDrive-Personal/Documents/RSS - Running The Business (chat folder)/Running the business/Running the business/Blueprint Re-Write V.2 3-11-26/7:1:26-Re-writes";

const OUT_DIR = path.join(process.cwd(), "content", "modules");

const FILE_TO_SLUG = (filename) => {
  if (/^Module_19_Premium_Cleaned_.*\.docx$/.test(filename))
    return "module-19-premium";
  const m = filename.match(/^Module_(\d{2})_(BEEFED|Cleaned)_.*\.docx$/);
  return m ? `module-${m[1]}` : null;
};

const IS_BEEFED = (filename) => /_BEEFED_/.test(filename);

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

  // 4b. July 2026: two duplicate tools retired, count is now 69.
  out = out
    .replace(/\b71 downloadable tools\b/gi, "69 downloadable tools")
    .replace(/\b71 ready-to-use tools\b/gi, "69 ready-to-use tools")
    .replace(/\b71 tools\b/g, "69 tools");

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

// A full-bold paragraph is a section heading when it is short and does not
// end like a sentence. Long bold paragraphs and lead-ins ending in ":" or "."
// are emphasis prose and stay bold.
function isHeading(text) {
  return text.length <= 70 && !/[.:,;]$/.test(text);
}

// Walk paragraphs (blank-line separated) and clean up for the public lesson.
function rewriteContent(md) {
  // Split on blank lines, keeping non-empty paragraphs.
  const paragraphs = md.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  let title = null;
  let subtitle = null;
  const lessonChunks = [];
  let i = 0;

  // Phase 1: header. Two formats exist in the July 2026 sources:
  //   (a) bold paras: __MODULE N__ then __Title__ then the subtitle line
  //   (b) one line: "MODULE 9: Home Sale Strategy" (plain or bold) then an
  //       italic subtitle and real `#` headings (Module 09 style)
  for (; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const stripped = p.replace(/^\*\*|\*\*$/g, "").trim();

    // "MODULE N: Title" one-liner carries the title itself.
    const oneLiner = stripped.match(/^MODULE\s+\d+:\s*(.+)$/i);
    if (oneLiner) {
      if (!title) title = oneLiner[1].trim();
      continue;
    }

    const boldOnly = p.match(/^\*\*(.+)\*\*$/);
    if (boldOnly) {
      const text = boldOnly[1].trim();
      if (/^MODULE\s+\d+/i.test(text)) continue;
      if (!title) {
        title = text;
        continue;
      }
      // Second bold para after the title = first section heading; body begins.
      break;
    }
    if (!subtitle && /Riggins Strategic Solutions/i.test(p)) {
      // May be italic-wrapped; strip emphasis markers for the frontmatter.
      subtitle = p.replace(/^\*|\*$/g, "").trim();
      continue;
    }
    // Any other paragraph before a heading = body has begun.
    if (title) break;
  }

  // Phase 2: from i onward, everything is body. Short full-bold paragraphs
  // become H2 section headings; everything else passes through untouched
  // (including the IMPORTANT DISCLAIMER block, which must never be stripped).
  for (; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    // Real ATX headings (Module 09 style docx) — normalize to H2.
    const atx = p.match(/^#{1,3}\s+(.+)$/);
    if (atx) {
      lessonChunks.push(`## ${atx[1].trim()}`);
      continue;
    }
    const boldOnly = p.match(/^\*\*(.+)\*\*$/);
    if (boldOnly && isHeading(boldOnly[1].trim())) {
      lessonChunks.push(`## ${boldOnly[1].trim()}`);
      continue;
    }
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
  const all = (await readdir(SOURCE_DIR))
    .filter((f) => f.endsWith(".docx") && f.startsWith("Module_"))
    .sort();

  // Keeper rule: when a module has both a _BEEFED_ and a _Cleaned_ file,
  // the BEEFED one wins (the Cleaned copy is an intermediate pass).
  const keeperBySlug = new Map();
  for (const filename of all) {
    const slug = FILE_TO_SLUG(filename);
    if (!slug) continue;
    const existing = keeperBySlug.get(slug);
    if (!existing || (IS_BEEFED(filename) && !IS_BEEFED(existing))) {
      keeperBySlug.set(slug, filename);
    }
  }
  const files = [...keeperBySlug.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  console.log(`Found ${files.length} keeper docx files. Output dir: ${OUT_DIR}\n`);

  for (const [slug, filename] of files) {

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
