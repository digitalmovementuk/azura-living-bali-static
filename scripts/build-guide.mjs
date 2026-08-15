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

/** A stable id for a heading, so the jump list can address it. */
function slug(text) {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// The site's own booking widget, already linked from the home page.
const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/bookings/azura-discovery-call';

// The site's own brochure link. Same URL as the home page's three "Download
// Brochure" buttons — see the note in seo-patch.mjs for why this is not a form.
const BROCHURE_URL =
  'https://wa.me/6282322846087?text=Hi%2C%20could%20you%20please%20share%20the%20Azura%20brochure%20with%20me%3F';

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
  .map((sec, i) => {
    const parts = [`<h2 id="${slug(sec.h2)}">${sec.h2}</h2>`];
    for (const p of sec.paragraphs) parts.push(`<p>${p}</p>`);
    if (sec.h3) {
      parts.push(`<h3>${sec.h3}</h3>`);
      for (const p of sec.h3_paragraphs || []) parts.push(`<p>${p}</p>`);
    }
    // Three photographs across 1,700 words. A guide this long with one image
    // reads as a wall; these are the same villas the home page shows, with the
    // captions already written for them.
    for (const f of COPY.figures || []) {
      if (f.after !== i) continue;
      parts.push(
        `<figure class="${MARK}-figure">`
        + `<img src="${f.src}" alt="${esc(f.alt)}"`
        + ' width="1200" height="800" loading="lazy" decoding="async">'
        + `<figcaption>${esc(f.caption)}</figcaption></figure>`
      );
    }
    return parts.join('\n');
  })
  .join('\n');

// Twelve sections over 8,200px. Someone who arrived from "can a foreigner buy
// property in Bali" wants their own route, not a scroll. The label is a
// paragraph rather than a heading on purpose: it is interface, and it should
// not appear in the page's heading outline.
const TOC = `<nav class="${MARK}-toc" aria-label="${esc(COPY.toc_label)}">
      <p class="${MARK}-toc-title">${esc(COPY.toc_label)}</p>
      <ul>
${COPY.sections.map((sec) => `        <li><a href="#${slug(sec.h2)}">${sec.h2}</a></li>`).join('\n')}
      </ul>
    </nav>`;

const ACTIONS = `<div class="${MARK}-actions">
      <a class="${MARK}-btn ${MARK}-btn-primary" href="${BROCHURE_URL}" target="_blank" rel="noopener">Download Brochure</a>
      <a class="${MARK}-btn ${MARK}-btn-secondary" href="${BOOKING_URL}" target="_blank" rel="noopener">Book Discovery Call</a>
    </div>`;

const main = `<main class="site-content" id="content">
<article class="${MARK} ${MARK}-guide" aria-labelledby="${MARK}-guide-title">
  <div class="${MARK}-inner">
    <nav class="${MARK}-crumbs" aria-label="Breadcrumb">
      <a href="/">Azura Living Bali</a> <span aria-hidden="true">/</span> Bali Property Investment
    </nav>
    <h1 class="${MARK}-guide-h1" id="${MARK}-guide-title">${esc(COPY.h1)}</h1>
    <p class="${MARK}-guide-lede">${COPY.lede}</p>
    ${TOC}
    ${blocks}
    <p class="${MARK}-close"><strong>${COPY.closing_line}</strong></p>
    ${ACTIONS}
    <p class="${MARK}-note">${COPY.legal_note}</p>
  </div>
</article>
</main>`;

// No stylesheet here. The <head> is taken from the home page, which already
// links /assets/css/azura-invest.css — one file for both pages, so a change to
// a shared component cannot land on one and miss the other.

const page = `<!DOCTYPE html>
<html lang="en-GB">
${head}
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
