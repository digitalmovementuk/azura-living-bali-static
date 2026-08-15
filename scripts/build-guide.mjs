#!/usr/bin/env node
/**
 * build-guide.mjs — build public/bali-property-investment/index.html
 *
 * The guide page is the site's dedicated target for the search term
 * "bali property investment": it is the only URL that can carry the term in
 * its slug, and the results page for that term is made of guides, not of
 * homepages.
 *
 * The page is assembled from public/index.html so the header, the footer and
 * the stylesheet are byte-identical to the rest of the site. Only the <head>
 * metadata and the <main> content are new. Re-run it after any change to the
 * home page's header or footer.
 *
 *   node scripts/build-guide.mjs
 *   node scripts/build-guide.mjs --check    # exit 1 if the page is missing or stale
 *
 * Copy lives in scripts/guide-copy.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'public', 'index.html');
const OUT_DIR = path.join(ROOT, 'public', 'bali-property-investment');
const OUT = path.join(OUT_DIR, 'index.html');
const COPY = JSON.parse(fs.readFileSync(path.join(__dirname, 'guide-copy.json'), 'utf8'));
const CHECK = process.argv.includes('--check');
const MARK = 'azura-invest';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Slice from `startNeedle` up to and including `endNeedle`. */
function slice(html, startNeedle, endNeedle, label) {
  const a = html.indexOf(startNeedle);
  if (a < 0) throw new Error(`build-guide: cannot find start of ${label}`);
  const b = html.indexOf(endNeedle, a);
  if (b < 0) throw new Error(`build-guide: cannot find end of ${label}`);
  return html.slice(a, b + endNeedle.length);
}

const src = fs.readFileSync(SOURCE, 'utf8');

// ---------------------------------------------------------------------------
// <head> — reuse the home page's, then replace everything page-specific.
// ---------------------------------------------------------------------------
let head = slice(src, '<head>', '</head>', '<head>');

head = head.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(COPY.meta_title)}</title>`);
head = head.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="${esc(COPY.meta_description)}">`
);
head = head.replace(
  /<link rel="canonical" href="[^"]*">/,
  `<link rel="canonical" href="${COPY.canonical}">`
);
if (!head.includes('rel="canonical"')) {
  head = head.replace(
    /<meta name="robots"/,
    `<link rel="canonical" href="${COPY.canonical}">\n<meta name="robots"`
  );
}
head = head.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${COPY.canonical}" />`);
head = head.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(COPY.meta_title)}" />`);
head = head.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(COPY.og_description)}" />`);
head = head.replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${esc(COPY.meta_title)}" />`);
head = head.replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${esc(COPY.og_description)}" />`);
head = head.replace(/<meta property="og:type" content="[^"]*" \/>/, '<meta property="og:type" content="article" />');
// Dead WordPress endpoints inherited from the mirror.
head = head.replace(/<link rel="alternate"[^>]*(?:\/feed\/|comments\/feed\/|wp-json)[^>]*\/?>\s*/g, '');

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${COPY.canonical}#webpage`,
      url: COPY.canonical,
      name: COPY.meta_title,
      description: COPY.meta_description,
      inLanguage: 'en-GB',
      isPartOf: { '@id': 'https://azuralivingbali.com/#website' },
      publisher: { '@id': 'https://azuralivingbali.com/#organization' },
      breadcrumb: { '@id': `${COPY.canonical}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${COPY.canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Azura Living Bali', item: 'https://azuralivingbali.com/' },
        { '@type': 'ListItem', position: 2, name: 'Bali Property Investment' },
      ],
    },
  ],
};
head = head.replace(
  /<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/,
  `<script type="application/ld+json" class="${MARK}-schema">${JSON.stringify(graph)}</script>`
);

// ---------------------------------------------------------------------------
// Header and footer — taken verbatim, with in-page anchors repointed home.
// ---------------------------------------------------------------------------
let header = slice(src, '<header data-rocket-location-hash', '</header>\n\t\t\t\t</header>', 'site header');
header = header.replace(/href="#(?!")/g, 'href="/#');

const footerStart = src.indexOf('<div class="site-footer">');
let depth = 0;
let footerEnd = -1;
for (const m of src.slice(footerStart).matchAll(/<div\b[^>]*>|<\/div>/g)) {
  if (m[0].startsWith('</')) {
    depth -= 1;
    if (depth === 0) { footerEnd = footerStart + m.index + m[0].length; break; }
  } else depth += 1;
}
if (footerEnd < 0) throw new Error('build-guide: cannot find end of site footer');
let footer = src.slice(footerStart, footerEnd).replace(/href="#(?!")/g, 'href="/#');

// Everything from the end of the footer to </body>: the site's scripts.
const scripts = src.slice(footerEnd, src.indexOf('</body>'));

const bodyOpen = slice(src, '<body', '>', '<body>');

// ---------------------------------------------------------------------------
// <main> — the guide itself.
// ---------------------------------------------------------------------------
const blocks = COPY.sections
  .map((s, i) => {
    const parts = [`<h2${i === 0 ? ` id="${MARK}-title"` : ''}>${s.h2}</h2>`];
    for (const p of s.paragraphs) parts.push(`<p>${p}</p>`);
    if (s.h3) {
      parts.push(`<h3>${s.h3}</h3>`);
      for (const p of s.h3_paragraphs || []) parts.push(`<p>${p}</p>`);
    }
    if (i === COPY.image_after_section) {
      parts.push(
        `<figure class="${MARK}-figure">`
        + '<img src="/assets/images/tabanan-jatiluwih-rice-terraces.jpg"'
        + ` alt="${esc(COPY.figure_alt)}" width="1200" height="800" loading="lazy" decoding="async">`
        + `<figcaption>${esc(COPY.figure_caption)}</figcaption></figure>`
      );
    }
    return parts.join('\n');
  })
  .join('\n');

const main = `<main class="site-content" id="content">
<article class="${MARK} ${MARK}-guide" aria-labelledby="${MARK}-title">
  <div class="${MARK}-inner">
    <nav class="${MARK}-crumbs" aria-label="Breadcrumb">
      <a href="/">Azura Living Bali</a> <span aria-hidden="true">/</span> Bali Property Investment
    </nav>
    <h1 class="${MARK}-guide-h1">${esc(COPY.h1)}</h1>
    <p class="${MARK}-guide-lede">${COPY.lede}</p>
    ${blocks}
    <p class="${MARK}-close"><strong>${COPY.closing_line}</strong></p>
    <p class="${MARK}-note">${COPY.legal_note}</p>
    <p class="${MARK}-cta"><a href="/#brochure">Get the full investment brochure</a></p>
  </div>
</article>
</main>`;

const css = `<style id="${MARK}-guide-css">
.${MARK}-guide{background:#FDF9EE;color:#2E2E2E;padding:112px 24px 96px;
  font-family:"Inter","Inter Tight",system-ui,sans-serif;
  -webkit-hyphens:auto;hyphens:auto}
.${MARK}-guide .${MARK}-inner{max-width:760px;margin:0 auto}
.${MARK}-crumbs{font-size:.8125rem;color:#7A7466;margin:0 0 28px}
.${MARK}-crumbs a{color:#7A7466;text-decoration:none}
.${MARK}-crumbs a:hover{color:#2E2E2E;text-decoration:underline}
.${MARK}-guide .${MARK}-eyebrow{display:block;font-size:.75rem;letter-spacing:.22em;
  text-transform:uppercase;color:#CFB010;margin:0 0 16px;font-weight:600}
.${MARK}-guide-h1{font-family:"The Seasons","Lora",Georgia,serif;font-weight:400;
  font-size:clamp(2rem,5vw,3.1rem);line-height:1.12;letter-spacing:-.015em;
  color:#2E2E2E;margin:0 0 22px}
.${MARK}-guide-lede{font-size:1.25rem;line-height:1.6;color:#2E2E2E;margin:0 0 8px}
.${MARK}-guide h2{font-family:"The Seasons","Lora",Georgia,serif;font-weight:400;
  font-size:clamp(1.55rem,3.3vw,2.2rem);line-height:1.22;color:#2E2E2E;
  margin:56px 0 18px;letter-spacing:-.01em}
.${MARK}-guide h3{font-family:"Inter",system-ui,sans-serif;font-weight:600;
  font-size:1.0625rem;color:#2E2E2E;margin:32px 0 12px}
.${MARK}-guide p{font-size:1.0625rem;line-height:1.72;margin:0 0 20px;color:#3A3A3A}
.${MARK}-guide strong{font-weight:600;color:#2E2E2E}
.${MARK}-guide a{color:#2E2E2E;text-decoration:underline;text-underline-offset:3px;
  text-decoration-color:#CFB010;text-decoration-thickness:2px}
.${MARK}-guide a:hover{color:#000}
.${MARK}-figure{margin:48px 0}
.${MARK}-figure img{width:100%;height:auto;display:block}
.${MARK}-figure figcaption{font-size:.8125rem;color:#7A7466;margin-top:10px}
.${MARK}-close{margin-top:56px;padding-top:28px;border-top:1px solid #E6E1D8;
  font-size:1.0625rem;color:#2E2E2E}
.${MARK}-note{font-size:.875rem;line-height:1.6;color:#7A7466}
.${MARK}-cta{margin-top:36px}
.${MARK}-cta a{display:inline-block;background:#2E2E2E;color:#FDF9EE;
  padding:16px 30px;text-decoration:none;font-size:.9375rem;font-weight:600;
  letter-spacing:.04em}
.${MARK}-cta a:hover{background:#000;color:#fff}
@media (max-width:768px){
  .${MARK}-guide{padding:80px 20px 64px}
  .${MARK}-guide h2{margin:44px 0 14px}
  .${MARK}-guide p{font-size:1rem;line-height:1.7}
  .${MARK}-guide-lede{font-size:1.125rem}
}
</style>`;

const page = `<!DOCTYPE html>
<html lang="en-GB">
${head.replace('</head>', `${css}\n</head>`)}
${bodyOpen}
<a class="screen-reader-text skip-link" href="#content" title="Skip to content">Skip to content</a>
${header}
${main}
${footer}
${scripts}
</body>
</html>
`;

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.error('MISSING: public/bali-property-investment/index.html'); process.exit(1); }
  if (fs.readFileSync(OUT, 'utf8') !== page) {
    console.error('STALE: public/bali-property-investment/index.html — re-run scripts/build-guide.mjs');
    process.exit(1);
  }
  console.log('OK — guide page is present and current');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`Built public/bali-property-investment/index.html (${page.length} bytes)`);
