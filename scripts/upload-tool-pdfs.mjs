#!/usr/bin/env node
// Uploads the 69 rewritten tool PDFs (July 2026 content pass) to the private
// `blueprint-tools` Supabase Storage bucket, upserting over the old versions.
// Object keys are `<pdfName>.pdf`, matching what /api/pdf/[toolSlug] signs.
//
// CAUTION: uploads are live immediately for logged-in users, independent of
// any code deploy. Run only after the content is approved.
//
// Usage:
//   node scripts/upload-tool-pdfs.mjs --dry-run   # list what would upload
//   node scripts/upload-tool-pdfs.mjs             # upload for real

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SOURCE_DIR =
  "/Users/rigginsstrategicsolutions/Library/CloudStorage/OneDrive-Personal/Documents/RSS - Running The Business (chat folder)/Running the business/Running the business/Tools-Checklists Re-Write V.2 3-11-26/Edited 7-2-26";

const DRY_RUN = process.argv.includes("--dry-run");

// Load env from .env.local the same way Next does, without extra deps.
const envFile = await readFile(
  path.join(process.cwd(), ".env.local"),
  "utf8"
);
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const files = (await readdir(SOURCE_DIR))
  .filter((f) => f.endsWith(".pdf") && f.startsWith("Tool_"))
  .sort();

console.log(`${files.length} PDFs in source. ${DRY_RUN ? "DRY RUN." : "Uploading..."}`);

let ok = 0;
let failed = 0;
for (const filename of files) {
  if (DRY_RUN) {
    console.log(`  would upload ${filename}`);
    continue;
  }
  const buffer = await readFile(path.join(SOURCE_DIR, filename));
  const { error } = await supabase.storage
    .from("blueprint-tools")
    .upload(filename, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) {
    failed++;
    console.error(`  FAIL ${filename}: ${error.message}`);
  } else {
    ok++;
    console.log(`  ok   ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  }
}

if (!DRY_RUN) console.log(`\nDone. ${ok} uploaded, ${failed} failed.`);
