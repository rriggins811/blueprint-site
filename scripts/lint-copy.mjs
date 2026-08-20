#!/usr/bin/env node
// Copy linter (warn-mode). Audit roadmap item 5, Ryan-approved 2026-08-20.
// Reports em dashes, banned words, and retired-product strings in content and source.
// NEVER fails the build; it makes drift visible in every build log.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['content', 'src'];
const EXT = new Set(['.md', '.mdx', '.ts', '.tsx']);
const BANNED = [/game[ -]changer/gi, /deep[ -]dive/gi];  // hard-banned (Ryan 2026-08-20)
const SPARING = [/\bjourney\b/gi, /\bleverage\b/gi, /\bnavigat(e|ing|ion)\b/gi, /\bempower/gi, /\bunlock/gi, /important to note/gi];  // allowed sparingly
const RETIRED = [/\$297(?![\d,.])/g, /\$47(?![\d,.])/g, /(?:mind ?map|the map)[^.\n]{0,40}\$9\.99|\$9\.99[^.\n]{0,40}(?:mind ?map|the map)/gi, /seniortransitionblueprint\.com/gi, /Blueprint Premium/gi];

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (EXT.has(extname(e))) yield p;
  }
}

let em = [], banned = [], retired = [], sparing = 0;
for (const root of ROOTS) {
  let files; try { files = [...walk(root)]; } catch { continue; }
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    const e = (t.match(/—/g) || []).length;
    if (e) em.push([f, e]);
    for (const re of BANNED) { const m = t.match(re); if (m) banned.push([f, re.source, m.length]); }
    for (const re of SPARING) { const m = t.match(re); if (m) sparing += m.length; }
    for (const re of RETIRED) { const m = t.match(re); if (m) retired.push([f, re.source, m.length]); }
  }
}
const top = (a, n) => a.sort((x, y) => (y[2] ?? y[1]) - (x[2] ?? x[1])).slice(0, n);
console.log(`[lint-copy] em-dash files: ${em.length} | HARD-banned hits: ${banned.length} | sparing-words total: ${sparing} | RETIRED-PRODUCT hits: ${retired.length}`);
if (banned.length) { console.log('[lint-copy] HARD-BANNED (game-changer / deep dive), fix these:'); for (const [f, p2, n] of banned.slice(0, 10)) console.log(`   ${f} (${p2} x${n})`); }
if (retired.length) { console.log('[lint-copy] SEVERE, retired products still referenced:'); for (const [f, p, n] of top(retired, 15)) console.log(`   ${f}  (${p} x${n})`); }
if (em.length) { em.sort((a, b) => b[1] - a[1]); console.log('[lint-copy] top em-dash files:'); for (const [f, n] of em.slice(0, 5)) console.log(`   ${f} (x${n})`); }
process.exit(0);
