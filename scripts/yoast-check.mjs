#!/usr/bin/env node
/**
 * yoast-check.mjs — score public/index.html with Yoast SEO's own compiled
 * analysis engine and print the two scores plus every failing assessment.
 *
 *   node scripts/yoast-check.mjs
 *
 * Scope: the <main id="content"> element, with script/style/svg/noscript/
 * video/audio/iframe/nav stripped. That is the same scope the shared DM
 * scorer applies to a WordPress page, so the numbers are comparable with
 * every other DM page rather than being a one-off.
 *
 * Delegates all scoring to Live Projects/DM UK/wordpress-dmuk/bin/yoast-score.mjs,
 * which drives Yoast's real AnalysisWebWorker. Nothing here re-implements a
 * Yoast rule.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'public', 'index.html');
const SCORER = path.resolve(
  ROOT,
  '../../Live Projects/DM UK/wordpress-dmuk/bin/yoast-score.mjs'
);
const KEYPHRASE = 'bali property investment';

const html = fs.readFileSync(PAGE, 'utf8');

function attr(re) {
  const m = re.exec(html);
  return m ? m[1] : '';
}

const title = attr(/<title>([\s\S]*?)<\/title>/);
const description = attr(/<meta name="description" content="([^"]*)"/);

const mainMatch = /<main\b[^>]*id="content"[^>]*>([\s\S]*)<\/main>/i.exec(html);
if (!mainMatch) {
  console.error('No <main id="content"> found — run scripts/seo-patch.mjs first.');
  process.exit(1);
}

const record = {
  id: 'azura-home',
  path: '/',
  slug: '',
  permalink: 'https://azuralivingbali.com/',
  keyphrase: KEYPHRASE,
  seo_title: title,
  meta_description: description,
  html: `<main>${mainMatch[1]}</main>`,
};

const tmp = path.join(os.tmpdir(), `azura-yoast-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify([record]));

const out = execFileSync('node', [SCORER, tmp, '--locale', 'en_GB', '--no-used-keywords'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
fs.unlinkSync(tmp);

const [res] = JSON.parse(out);
const strip = (s) => s.replace(/<[^>]+>/g, '').trim();

console.log(`\nKeyphrase:   ${KEYPHRASE}`);
console.log(`SEO title:   ${title}`);
console.log(`SEO score:          ${res.seo_score} (${res.seo_color})`);
console.log(`Readability score:  ${res.readability_score} (${res.readability_color})\n`);

for (const [label, rows] of [
  ['SEO', res.seo_results],
  ['READABILITY', res.readability_results],
]) {
  const bad = rows.filter((r) => r.score > 0 && r.score < 9 && strip(r.text));
  console.log(`--- ${label}: ${bad.length ? `${bad.length} not green` : 'all green'} ---`);
  for (const r of bad) console.log(`  [${r.score}] ${r.identifier}: ${strip(r.text)}`);
  console.log('');
}

// The ceiling, not 100. Three assessments cannot be beaten on this URL:
//   textCompetingLinks and singleH1 return 8 as their best possible value,
//   so the SEO average can never reach 9; and slugKeyword wants the keyphrase
//   in the slug, which the home page cannot have because it is the root.
// Yoast's readability roll-up only ever returns 30, 60 or 90.
const ALLOWED_BELOW_MAX = new Set(['textCompetingLinks', 'singleH1', 'slugKeyword']);
const unexpected = res.seo_results
  .concat(res.readability_results)
  .filter((r) => r.score > 0 && r.score < 9 && !ALLOWED_BELOW_MAX.has(r.identifier));

const atCeiling = res.seo_score >= 94 && res.readability_score >= 90 && unexpected.length === 0;
console.log(atCeiling
  ? 'AT CEILING — every assessment is at its best possible value for a root URL.'
  : `BELOW CEILING — ${unexpected.length} assessment(s) can still be improved.`);
process.exit(atCeiling ? 0 : 2);
