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
import { fileURLToPath } from 'node:url';

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
const CSS = `
<style id="${MARK}-css">
.${MARK}{background:#FDF9EE;color:#2E2E2E;padding:96px 24px;
  font-family:"Inter","Inter Tight",system-ui,sans-serif;
  -webkit-hyphens:auto;hyphens:auto}
.${MARK}-inner{max-width:760px;margin:0 auto}
.${MARK}-eyebrow{display:block;font-size:.75rem;letter-spacing:.22em;
  text-transform:uppercase;color:#CFB010;margin:0 0 18px;font-weight:600}
.${MARK} h2{font-family:"The Seasons","Lora",Georgia,serif;font-weight:400;
  font-size:clamp(1.6rem,3.4vw,2.3rem);line-height:1.22;color:#2E2E2E;
  margin:56px 0 18px;letter-spacing:-.01em}
.${MARK} h2:first-of-type{margin-top:0}
.${MARK} h3{font-family:"Inter",system-ui,sans-serif;font-weight:600;
  font-size:1.0625rem;letter-spacing:.01em;color:#2E2E2E;margin:32px 0 12px}
.${MARK} p{font-size:1.0625rem;line-height:1.72;margin:0 0 20px;color:#3A3A3A}
.${MARK} a{color:#2E2E2E;text-decoration:underline;text-underline-offset:3px;
  text-decoration-color:#CFB010;text-decoration-thickness:2px}
.${MARK} a:hover{color:#000}
.${MARK}-figure{margin:48px 0}
.${MARK}-figure img{width:100%;height:auto;display:block;border-radius:2px}
.${MARK}-figure figcaption{font-size:.8125rem;color:#7A7466;margin-top:10px}
.${MARK} strong{font-weight:600;color:#2E2E2E}
.${MARK}-close{margin-top:56px;padding-top:28px;border-top:1px solid #E6E1D8;
  font-size:1.0625rem;color:#2E2E2E}
.${MARK}-note{font-size:.875rem;line-height:1.6;color:#7A7466;margin-top:32px}
/* The hero. The eyebrow carries the keyphrase above the client's own display
   line, so both survive; it must never run into it. Colours are inherited
   from the hero widget, because the hero sits on video and its text is white. */
.${MARK}-h1-eyebrow{display:block;font-family:"Inter","Inter Tight",system-ui,sans-serif;
  font-size:clamp(.7rem,1vw,.8125rem);letter-spacing:.22em;text-transform:uppercase;
  font-weight:600;color:#E8C84B;line-height:1.35;margin:0 0 20px}
.${MARK}-h1-main{display:block}
.${MARK}-hero-lede{color:inherit;font-size:clamp(1rem,1.3vw,1.1875rem);
  line-height:1.55;margin:0 0 10px;max-width:46ch}
.${MARK}-hero-sub{color:inherit;margin:0;opacity:.85}
/* Semantics only: this heading must look exactly like the text widget it
   replaced, so every inherited heading style is reset. */
.${MARK}-h2v{font:inherit;color:inherit;letter-spacing:inherit;
  line-height:inherit;text-transform:inherit;margin:0;padding:0;display:inline}
@media (max-width:768px){
  .${MARK}{padding:64px 20px}
  .${MARK} h2{margin:44px 0 14px}
  .${MARK} p{font-size:1rem;line-height:1.7}
}
</style>`;

const blocks = COPY.sections
  .map((s, i) => {
    const parts = [`<h2>${s.h2}</h2>`];
    for (const p of s.paragraphs) parts.push(`<p>${p}</p>`);
    if (s.h3) {
      parts.push(`<h3>${s.h3}</h3>`);
      for (const p of s.h3_paragraphs || []) parts.push(`<p>${p}</p>`);
    }
    // Photographs break the column and carry alt text of their own.
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

const SECTION = `${CSS}
<section class="${MARK}" id="bali-property-investment" aria-labelledby="${MARK}-title">
  <div class="${MARK}-inner">
    <span class="${MARK}-eyebrow">${esc(COPY.eyebrow)}</span>
    ${blocks.replace('<h2>', `<h2 id="${MARK}-title">`)}
    <p class="${MARK}-close"><strong>${COPY.closing_line}</strong></p>
    <p class="${MARK}-note">${COPY.legal_note}</p>
  </div>
</section>
`;

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
    ['json-ld', `class="${MARK}-schema"`],
    ['lang en-GB', '<html lang="en-GB"'],
  ];
  const current = fs.readFileSync(PAGE, 'utf8');
  for (const [label, needle] of musts) {
    if (!current.includes(needle)) missing.push(label);
  }
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
