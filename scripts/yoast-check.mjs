#!/usr/bin/env node
/**
 * yoast-check.mjs — score our two pages with Yoast SEO's own compiled analysis
 * engine and print the two scores plus every failing assessment.
 *
 *   node scripts/yoast-check.mjs           both pages
 *   node scripts/yoast-check.mjs home      just the home page
 *   node scripts/yoast-check.mjs guide     just the guide page
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
const SCORER = path.resolve(
  ROOT,
  '../../Live Projects/DM UK/wordpress-dmuk/bin/yoast-score.mjs'
);
const KEYPHRASE = 'bali property investment';

/**
 * Two assessments return 8 as their *best* possible value, so the weighted SEO
 * average can never reach 9 on any page: textCompetingLinks and singleH1.
 * slugKeyword is a third, but only on the home page — it wants the keyphrase in
 * the slug, and the root has no slug. That gap is the reason the guide page
 * exists, so the guide is held to the higher ceiling.
 */
const PAGES = {
  home: {
    id: 'azura-home',
    file: 'public/index.html',
    slug: '',
    permalink: 'https://azuralivingbali.com/',
    seoCeiling: 94,
    allowed: ['textCompetingLinks', 'singleH1', 'slugKeyword'],
    ceilingNote: 'a root URL, which cannot carry the keyphrase in its slug',
  },
  guide: {
    id: 'azura-guide',
    file: 'public/bali-property-investment/index.html',
    slug: 'bali-property-investment',
    permalink: 'https://azuralivingbali.com/bali-property-investment/',
    seoCeiling: 99,
    allowed: ['textCompetingLinks', 'singleH1'],
    ceilingNote: 'any URL',
  },
};

const wanted = process.argv[2];
if (wanted && !PAGES[wanted]) {
  console.error(`Unknown page "${wanted}". Use: home, guide, or nothing for both.`);
  process.exit(1);
}
const selected = wanted ? [wanted] : Object.keys(PAGES);

const strip = (s) => s.replace(/<[^>]+>/g, '').trim();
let allAtCeiling = true;

for (const key of selected) {
  const page = PAGES[key];
  const file = path.join(ROOT, page.file);
  if (!fs.existsSync(file)) {
    console.error(`\nMissing ${page.file} — run the build scripts first.`);
    process.exit(1);
  }
  const html = fs.readFileSync(file, 'utf8');

  const attr = (re) => { const m = re.exec(html); return m ? m[1] : ''; };
  const title = attr(/<title>([\s\S]*?)<\/title>/);
  const description = attr(/<meta name="description" content="([^"]*)"/);

  const mainMatch = /<main\b[^>]*id="content"[^>]*>([\s\S]*)<\/main>/i.exec(html);
  if (!mainMatch) {
    console.error(`No <main id="content"> in ${page.file} — run the build scripts first.`);
    process.exit(1);
  }

  const record = {
    id: page.id,
    path: `/${page.slug}`,
    slug: page.slug,
    permalink: page.permalink,
    keyphrase: KEYPHRASE,
    seo_title: title,
    meta_description: description,
    html: `<main>${mainMatch[1]}</main>`,
  };

  const tmp = path.join(os.tmpdir(), `azura-yoast-${page.id}-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify([record]));
  const out = execFileSync('node', [SCORER, tmp, '--locale', 'en_GB', '--no-used-keywords'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  fs.unlinkSync(tmp);
  const [res] = JSON.parse(out);

  console.log(`\n══ ${page.permalink}`);
  console.log(`Keyphrase:   ${KEYPHRASE}`);
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

  // Yoast's readability roll-up only ever returns 30, 60 or 90. There is no 100.
  const allowed = new Set(page.allowed);
  const unexpected = res.seo_results
    .concat(res.readability_results)
    .filter((r) => r.score > 0 && r.score < 9 && !allowed.has(r.identifier));

  const atCeiling = res.seo_score >= page.seoCeiling
    && res.readability_score >= 90
    && unexpected.length === 0;
  if (!atCeiling) allAtCeiling = false;
  console.log(atCeiling
    ? `AT CEILING — every assessment is at its best possible value for ${page.ceilingNote}.`
    : `BELOW CEILING — ${unexpected.length} assessment(s) can still be improved.`);
}

process.exit(allAtCeiling ? 0 : 2);
