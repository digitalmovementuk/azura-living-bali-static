#!/usr/bin/env node
/**
 * seo-patch.mjs — optimise public/index.html for the focus keyphrase
 * "bali property investment".
 *
 * Idempotent: every edit is guarded, so running it twice changes nothing.
 * Run after scripts/mirror.mjs, or on its own:
 *
 *   node scripts/seo-patch.mjs            # patch public/index.html in place
 *   node scripts/seo-patch.mjs --check    # exit 1 if any edit is missing
 *
 * Copy lives in scripts/seo-copy.json so the words can be revised without
 * touching the patching logic.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CSS, CSS_PATH } from './invest-css.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'public', 'index.html');
const COPY = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo-copy.json'), 'utf8'));
const CHECK = process.argv.includes('--check');

const CANONICAL = 'https://azuralivingbali.com/';
const MARK = 'azura-invest';            // marker class on everything we add
const failures = [];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A stable id for a heading, so a row can be linked to and found again. */
function slug(text) {
  return String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// The site's own booking widget, already linked from ten places on the page.
const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/bookings/azura-discovery-call';

// The site's own brochure link, copied from its three "Download Brochure"
// buttons. There is an Elementor brochure form in the page source, but it sits
// inside a popup template that never reaches the DOM, so an anchor to it is a
// dead link. WhatsApp is the route the client actually built.
const BROCHURE_URL =
  'https://wa.me/6282322846087?text=Hi%2C%20could%20you%20please%20share%20the%20Azura%20brochure%20with%20me%3F';

/** Replace `from` with `to`; record a failure if `from` is not present. */
function sub(html, from, to, label) {
  if (html.includes(to)) return html;          // already patched
  if (!html.includes(from)) { failures.push(label); return html; }
  return html.replace(from, to);
}

let html = fs.readFileSync(PAGE, 'utf8');
const before = html;

// ---------------------------------------------------------------------------
// 0. Patch from an unpatched source, always.
//
//    Several edits below replace client copy with our copy. Once applied,
//    the original text is gone, so editing seo-copy.json and re-running would
//    silently do nothing. Keeping the last unpatched version beside the
//    script means a copy change always lands.
//
//    A page with no injected section is, by definition, a fresh mirror: it
//    becomes the new source. A page that already has one is restored from
//    the stored source first, so this stays idempotent either way.
// ---------------------------------------------------------------------------
const SOURCE = path.join(__dirname, '.pristine-index.html');
if (!CHECK) {
  if (html.includes('id="bali-property-investment"')) {
    if (!fs.existsSync(SOURCE)) {
      console.error(
        'public/index.html is already patched and scripts/.pristine-index.html '
        + 'is missing. Restore the unpatched page (git show HEAD:public/index.html) '
        + 'before running this.'
      );
      process.exit(1);
    }
    html = fs.readFileSync(SOURCE, 'utf8');
  } else {
    fs.writeFileSync(SOURCE, html);
  }
}

// ---------------------------------------------------------------------------
// 1. <head> — title, description, canonical, robots, Open Graph, Twitter
// ---------------------------------------------------------------------------
html = sub(
  html,
  '<title>Azura Living Bali - 4BR Boutique Villas in Tabanan</title>',
  `<title>${esc(COPY.meta_title)}</title>`,
  'title'
);

html = html.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="${esc(COPY.meta_description)}">`
);
if (!html.includes(`<meta name="description" content="${esc(COPY.meta_description)}">`)) {
  failures.push('meta description');
}

// Canonical — the page had none at all.
if (!/rel="canonical"/.test(html)) {
  html = sub(
    html,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    `<link rel="canonical" href="${CANONICAL}">\n`
      + '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
    'canonical'
  );
}

// Open Graph / Twitter — the mirrored ones were scraped page text, unreadable.
html = html.replace(
  /<meta property="og:title" content="[^"]*" \/>/,
  `<meta property="og:title" content="${esc(COPY.meta_title)}" />`
);
html = html.replace(
  /<meta property="og:description" content="[^"]*" \/>/,
  `<meta property="og:description" content="${esc(COPY.og_description)}" />`
);
html = html.replace(
  /<meta name="twitter:title" content="[^"]*" \/>/,
  `<meta name="twitter:title" content="${esc(COPY.meta_title)}" />`
);
html = html.replace(
  /<meta name="twitter:description" content="[^"]*" \/>/,
  `<meta name="twitter:description" content="${esc(COPY.og_description)}" />`
);
html = html.replace(
  /<meta property="og:image:alt" content="[^"]*" \/>/,
  `<meta property="og:image:alt" content="${esc(COPY.og_image_alt)}" />`
);
for (const [label, needle] of [
  ['og:title', `<meta property="og:title" content="${esc(COPY.meta_title)}" />`],
  ['og:description', `<meta property="og:description" content="${esc(COPY.og_description)}" />`],
  ['twitter:title', `<meta name="twitter:title" content="${esc(COPY.meta_title)}" />`],
  ['twitter:description', `<meta name="twitter:description" content="${esc(COPY.og_description)}" />`],
]) {
  if (!html.includes(needle)) failures.push(label);
}

// Dead WordPress endpoints the mirror inherited. They 404 on a static host and
// hand crawlers four broken alternates.
html = html.replace(
  /<link rel="alternate"[^>]*(?:\/feed\/|comments\/feed\/|wp-json)[^>]*\/?>\s*/g,
  ''
);

// ---------------------------------------------------------------------------
// 2. JSON-LD — the mirrored graph advertises an Article by "Partner Azura".
//    Replace with a graph that describes what the page is: a real-estate
//    offering, its seller, and the FAQ the page answers.
// ---------------------------------------------------------------------------
const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['Organization', 'RealEstateAgent'],
      '@id': `${CANONICAL}#organization`,
      name: 'Azura Living Bali',
      legalName: 'Ultimate Horizons Property',
      url: CANONICAL,
      logo: {
        '@type': 'ImageObject',
        '@id': `${CANONICAL}#logo`,
        url: 'https://azuralivingbali.com/wp-content/uploads/2025/02/Azura_White_Logo_2__No_Background_.png',
        caption: 'Azura Living Bali',
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Villa #3, Jl. Veteran No.90, Buduk, Kec. Mengwi',
        addressLocality: 'Kabupaten Badung',
        addressRegion: 'Bali',
        postalCode: '80351',
        addressCountry: 'ID',
      },
      areaServed: { '@type': 'Place', name: 'Tabanan, Bali, Indonesia' },
      founder: { '@type': 'Person', name: 'Ayham Muhrez', jobTitle: 'Founder' },
    },
    {
      '@type': 'WebSite',
      '@id': `${CANONICAL}#website`,
      url: CANONICAL,
      name: 'Azura Living Bali',
      publisher: { '@id': `${CANONICAL}#organization` },
      inLanguage: 'en-GB',
    },
    {
      '@type': 'WebPage',
      '@id': `${CANONICAL}#webpage`,
      url: CANONICAL,
      name: COPY.meta_title,
      description: COPY.meta_description,
      isPartOf: { '@id': `${CANONICAL}#website` },
      about: { '@id': `${CANONICAL}#offering` },
      inLanguage: 'en-GB',
    },
    {
      '@type': 'Residence',
      '@id': `${CANONICAL}#offering`,
      name: 'Azura Boutique Villas, Tabanan',
      description: COPY.offering_description,
      numberOfRooms: 4,
      numberOfBathroomsTotal: 4.5,
      floorSize: { '@type': 'QuantitativeValue', value: 318, unitCode: 'MTK' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Tabanan',
        addressRegion: 'Bali',
        addressCountry: 'ID',
      },
    },
  ],
};
// Deliberately no FAQPage node. Google retired FAQ rich results for most
// sites; the house checklist lists it under tactics we decline to build.
// The questions stay visible in the page text, where extractors can read them.

html = html.replace(
  /<script type="application\/ld\+json" class="rank-math-schema">[\s\S]*?<\/script>/,
  `<script type="application/ld+json" class="${MARK}-schema">${JSON.stringify(graph)}</script>`
);
if (!html.includes(`class="${MARK}-schema"`)) failures.push('json-ld');

// ---------------------------------------------------------------------------
// 3. <html lang> — the mirror says en-US, the copy is British English.
// ---------------------------------------------------------------------------
html = html.replace(/<html lang="en-US"/i, '<html lang="en-GB"');
html = html.replace(/content="en_US"/g, 'content="en_GB"');

// ---------------------------------------------------------------------------
// 4. The H1 — must carry the keyphrase, must keep the hero's look.
//    Rendered as a small eyebrow line above the existing display type.
// ---------------------------------------------------------------------------
html = sub(
  html,
  '<h1 class="elementor-heading-title elementor-size-default">Boutique Villas <br />  by Azura</h1>',
  `<h1 class="elementor-heading-title elementor-size-default ${MARK}-h1">`
    + `<span class="${MARK}-h1-eyebrow">${esc(COPY.h1_eyebrow)}</span>`
    + `<span class="${MARK}-h1-main">${COPY.h1_main}</span></h1>`,
  'h1'
);

// ---------------------------------------------------------------------------
// 4b. The hero standfirst. The keyphrase has to appear in the page's first
//     paragraph, not only in the heading. The client's own wellness line is
//     kept verbatim underneath it.
// ---------------------------------------------------------------------------
const HERO_SUB = 'Wellness living in Bali’s emerging eco-luxury hotspot Tabanan';
html = sub(
  html,
  HERO_SUB,
  `<p class="${MARK}-hero-lede">${COPY.hero_lede}</p>`
    + `<p class="${MARK}-hero-sub">${HERO_SUB}</p>`,
  'hero standfirst'
);

// ---------------------------------------------------------------------------
// 4c. Four amenity labels in a row began with "Outdoor", in both the desktop
//     and the mobile block. Yoast counts that as a repetitive run and it
//     reads as one to a person too. Renaming two of the four fixes both.
//     ("barbeque" was also misspelled.)
// ---------------------------------------------------------------------------
for (const [from, to] of [
  ['<div>Outdoor barbeque area</div>', '<div>Barbecue area</div>'],
  ['<div>Outdoor lounge with sunken sofa</div>', '<div>Sunken sofa lounge</div>'],
  ['<div>Outdoor grill spot</div>', '<div>Grill spot</div>'],
  ['<div>Outdoor sunken sofa</div>', '<div>Sunken sofa lounge</div>'],
]) {
  if (html.includes(from)) html = html.replaceAll(from, to);
}

// ---------------------------------------------------------------------------
// 4d. The brochure heading — the one H2 on the page where the keyphrase
//     belongs anyway, because that is literally what the brochure is about.
// ---------------------------------------------------------------------------
html = html.replaceAll(
  '>Get Your Full Investment Brochure<',
  '>Get Your Full Bali Property Investment Brochure<'
);

// ---------------------------------------------------------------------------
// 4e. Two section titles on this page look like headings, read like headings
//     and are sized like headings, but Elementor built them as plain text
//     widgets. That left a 400-word stretch after the H1 with no subheading
//     in it, which is poor for a screen reader and is what Yoast's subheading
//     distribution check was complaining about. Promote both to real <h2>s.
//     The class resets every inherited heading style, so nothing moves.
//
//     "Why invest with Azura Living Bali?" is the obvious third candidate and
//     was deliberately NOT promoted: both of its copies sit inside an
//     elementor-hidden container, so no visitor ever sees it. A heading that
//     only a crawler can read is exactly the wrong fix.
// ---------------------------------------------------------------------------
const VISUAL_HEADINGS = [
  'Overview',
  'Interior Design.<br class="br" />Built for Well<span class="monserrat-text">&#8211;</span>being.',
];
if (!html.includes(`${MARK}-h2v`)) {
  for (const text of VISUAL_HEADINGS) {
    const from = `\t${text}\t`;
    if (!html.includes(from)) { failures.push(`visual heading: ${text.slice(0, 20)}`); continue; }
    html = html.replaceAll(from, `\t<h2 class="${MARK}-h2v">${text}</h2>\t`);
  }
}

// ---------------------------------------------------------------------------
// 4f. Image alt text. Sixty-eight images in the content area carried alt=""
//     and eight carried a fragment of marketing English. Every photograph now
//     describes what it shows and where it is. The icons keep alt="" on
//     purpose: each one sits beside its own text label, so a screen reader
//     that announced them would only repeat itself.
// ---------------------------------------------------------------------------
const ALTS = [
  ['2-fasad-malam-2', 'Modern villa exterior at night at Azura Living, a Bali property investment in Tabanan'],
  ['5CB22DDD-4A86-4A0F-B267-B7D756EAC0AC', 'High ceilings and open living space in an Azura Living Bali investment property'],
  ['seamless_indoor_outdoor', 'Indoor and outdoor living areas joined in an Azura Living Bali investment property'],
  ['DAB2EFA4-2055-4454-84B3-BD2764A984B8', 'Light-filled bathroom with premium materials in a Bali investment property in Tabanan'],
  ['Outdoor-view-sunken-sauna-plunge-pool', 'Garden with sunken sauna and plunge pool at a Bali property investment villa in Tabanan'],
  ['private_wellness', 'Private wellness area with cold plunge and sauna in an Azura Living Bali investment property'],
  ['3BF3803C-EF2A-4487-A419-EEBC060C26FA', 'Sunken sofa lounge in an Azura Living Bali investment property'],
  ['A-Siteplan', 'Site plan of the twelve villas at Azura Living, a Bali property investment in Tabanan'],
  ['/C-04-', 'Villa terrace and pool at Azura Living, a Bali property investment in Tabanan'],
];
html = html.replace(/<img\b[^>]*>/g, (tag) => {
  const hit = ALTS.find(([needle]) => tag.includes(needle));
  if (!hit) return tag;
  const alt = ` alt="${esc(hit[1])}"`;
  return /\balt="[^"]*"/.test(tag)
    ? tag.replace(/\balt="[^"]*"/, alt.trim())
    : tag.replace(/<img\b/, `<img${alt}`);
});

// ---------------------------------------------------------------------------
// 4g. /early-bird/ is in the sitemap but had no canonical link of its own.
//     A URL we ask Google to index should always say which URL it is.
// ---------------------------------------------------------------------------
const EARLY = path.join(ROOT, 'public', 'early-bird', 'index.html');
if (!CHECK && fs.existsSync(EARLY)) {
  let early = fs.readFileSync(EARLY, 'utf8');
  if (!early.includes('rel="canonical"')) {
    const patched = early.replace(
      /<meta name="robots"/,
      '<link rel="canonical" href="https://azuralivingbali.com/early-bird/">\n<meta name="robots"'
    );
    if (patched === early) failures.push('early-bird canonical');
    else fs.writeFileSync(EARLY, patched);
  }
}

// ---------------------------------------------------------------------------
// 5. <main> — the mirror has no main landmark, so the page's own "Skip to
//    content" link lands on a plain <div>. The element with id="content" is
//    already the content wrapper; promote it to <main>. Its matching close
//    tag was located by walking div depth, not guessed.
// ---------------------------------------------------------------------------
const MAIN_OPEN = '<main class="site-content" id="content">';
const MAIN_TAIL = '</div>\n</div>\n\n\n<div class="site-footer">';   // close(#content), close(#page)
if (!html.includes(MAIN_OPEN)) {
  const opened = html.replace(
    /<div\b[^>]*class="site-content" id="content">/,
    MAIN_OPEN
  );
  if (opened === html) failures.push('main open');
  html = opened;
}

// ---------------------------------------------------------------------------
// 6. The content section itself, inserted immediately before the footer —
//    the last thing read before the brochure form.
// ---------------------------------------------------------------------------
// The stylesheet is a real file, shared with the guide page. Writing it here
// keeps it beside the markup that needs it, and the query string is a hash of
// its own contents so a change is never served from cache.
const CSS_FILE = path.join(ROOT, 'public', CSS_PATH);
const CSS_HASH = crypto.createHash('sha1').update(CSS).digest('hex').slice(0, 8);
const CSS_LINK = `<link rel="stylesheet" id="${MARK}-css" href="/${CSS_PATH}?v=${CSS_HASH}">`;
if (!CHECK) {
  fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true });
  fs.writeFileSync(CSS_FILE, CSS);
}

// The first OPEN sections read straight down the page: they answer "can a
// foreigner buy property in Bali?", which is the question the search traffic
// is actually asking. The rest is real content a serious buyer wants, but not
// 9,700px of it in front of everyone — those become disclosure rows.
const OPEN = 3;

const blocks = COPY.sections
  .map((s, i) => {
    const id = slug(s.h2);
    const body = [];
    for (const p of s.paragraphs) body.push(`<p>${p}</p>`);
    if (s.h3) {
      body.push(`<h3>${s.h3}</h3>`);
      for (const p of s.h3_paragraphs || []) body.push(`<p>${p}</p>`);
    }
    // Photographs break the column and carry alt text of their own.
    for (const f of COPY.figures || []) {
      if (f.after !== i) continue;
      body.push(
        `<figure class="${MARK}-figure">`
        + `<img src="${f.src}" alt="${esc(f.alt)}"`
        + ' width="1200" height="800" loading="lazy" decoding="async">'
        + `<figcaption>${esc(f.caption)}</figcaption></figure>`
      );
    }
    if (i < OPEN) return [`<h2 id="${id}">${s.h2}</h2>`, ...body].join('\n');
    return `<details class="${MARK}-q" id="${id}">\n`
      + `<summary><h2>${s.h2}</h2></summary>\n`
      + `<div class="${MARK}-q-body">\n${body.join('\n')}\n</div>\n</details>`;
  })
  .join('\n');

// A shared link should land on the row it names, already open. Without this a
// visitor following "…/#the-real-risks-of-a-bali-property-investment" arrives
// at a closed row and sees nothing.
const OPENER = `<script>
(function () {
  function reveal() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var row = el.closest ? el.closest('details') : null;
    if (!row || row.open) return;
    row.open = true;
    requestAnimationFrame(function () { row.scrollIntoView(); });
  }
  window.addEventListener('hashchange', reveal);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reveal, { once: true });
  } else reveal();
})();
</script>`;

const ACTIONS = `<div class="${MARK}-actions">
      <a class="${MARK}-btn ${MARK}-btn-primary" href="${BROCHURE_URL}" target="_blank" rel="noopener">Download Brochure</a>
      <a class="${MARK}-btn ${MARK}-btn-secondary" href="${BOOKING_URL}" target="_blank" rel="noopener">Book Discovery Call</a>
    </div>`;

const SECTION = `
<section class="${MARK}" id="bali-property-investment" aria-labelledby="${MARK}-title">
  <div class="${MARK}-inner">
    <span class="${MARK}-eyebrow">${esc(COPY.eyebrow)}</span>
    ${blocks.replace(`<h2 id="${slug(COPY.sections[0].h2)}">`, `<h2 id="${MARK}-title">`)}
    <p class="${MARK}-close"><strong>${COPY.closing_line}</strong></p>
    ${ACTIONS}
    <p class="${MARK}-note">${COPY.legal_note}</p>
  </div>
</section>
${OPENER}
`;

// The stylesheet goes in <head>, not beside the markup: the guide page is
// built from this <head>, so linking it once here covers both pages.
if (!html.includes(`id="${MARK}-css"`)) {
  const linked = html.replace('</head>', `${CSS_LINK}\n</head>`);
  if (linked === html) failures.push('stylesheet link');
  else html = linked;
}

// The ROI calculator had no id at all — it was addressed only by a class the
// menu script reads — so the guide page's link to it went nowhere.
if (!/\bid="calculator"/.test(html)) {
  const withCalc = html.replace(
    /(<div class="elementor-element elementor-element-49a1d52 )/,
    '<div id="calculator"></div>$1'
  );
  if (withCalc === html) failures.push('calculator anchor');
  else html = withCalc;
}

if (!html.includes('id="bali-property-investment"')) {
  if (html.includes(MAIN_TAIL)) {
    html = html.replace(
      MAIN_TAIL,
      `${SECTION}</main>\n</div>\n\n\n<div class="site-footer">`
    );
  } else {
    failures.push('section insert');
  }
}

// ---------------------------------------------------------------------------
// 7. Image alt text — the hero poster and logo carried none or generic text.
// ---------------------------------------------------------------------------
html = html.replace(
  /<video([^>]*poster="\/assets\/images\/azura-hero-poster\.jpg"[^>]*)>/,
  (m, attrs) => (attrs.includes('aria-label')
    ? m
    : `<video${attrs} aria-label="${esc(COPY.hero_media_alt)}">`)
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (CHECK) {
  const missing = [];
  const musts = [
    ['title', `<title>${esc(COPY.meta_title)}</title>`],
    ['meta description', `<meta name="description" content="${esc(COPY.meta_description)}">`],
    ['canonical', `<link rel="canonical" href="${CANONICAL}">`],
    ['h1 keyphrase', `${MARK}-h1-eyebrow`],
    ['main landmark', MAIN_OPEN],
    ['main closed', '</main>'],
    ['content section', 'id="bali-property-investment"'],
    ['stylesheet link', `id="${MARK}-css"`],
    ['calculator anchor', 'id="calculator"'],
    ['end actions', `${MARK}-actions`],
    ['json-ld', `class="${MARK}-schema"`],
    ['lang en-GB', '<html lang="en-GB"'],
  ];
  const current = fs.readFileSync(PAGE, 'utf8');
  for (const [label, needle] of musts) {
    if (!current.includes(needle)) missing.push(label);
  }
  // Count the disclosure rows rather than merely looking for one. A partial
  // build — some sections wrapped, the rest left as a wall — still contains
  // the marker class, so a presence test would pass while the page was 9,000px
  // tall again.
  if (!fs.existsSync(CSS_FILE)) missing.push(`stylesheet file (public/${CSS_PATH})`);
  else if (fs.readFileSync(CSS_FILE, 'utf8') !== CSS) missing.push('stylesheet file is stale');
  const rows = (current.match(new RegExp(`<details class="${MARK}-q" id="[^"]+">`, 'g')) || []).length;
  const expected = COPY.sections.length - OPEN;
  if (rows !== expected) missing.push(`disclosure rows (${rows} of ${expected})`);
  if (missing.length) {
    console.error('MISSING: ' + missing.join(', '));
    process.exit(1);
  }
  console.log(`OK — all ${musts.length} SEO edits present in public/index.html`);
  process.exit(0);
}

if (failures.length) {
  console.error('FAILED to apply: ' + failures.join(', '));
  process.exit(1);
}

fs.writeFileSync(PAGE, html);
console.log(
  html === before
    ? 'No change — page already patched.'
    : `Patched public/index.html (${before.length} -> ${html.length} bytes)`
);
