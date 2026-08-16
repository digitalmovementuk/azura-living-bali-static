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

// The ROI calculator's Tailwind build, taken off jsdelivr and served from here.
// Refresh it with:
//   curl -sL -o public/assets/js/tailwind-browser-4.js \
//     https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4
const TAILWIND_PATH = 'assets/js/tailwind-browser-4.js';

/** Replace `from` with `to`; record a failure if `from` is not present. */
function sub(html, from, to, label) {
  if (html.includes(to)) return html;          // already patched
  if (!html.includes(from)) { failures.push(label); return html; }
  return html.replace(from, to);
}

/**
 * Replace every occurrence of `from`, and fail unless there were exactly
 * `count` of them. Several strings below sit in the page twice, once in the
 * desktop block and once in the mobile one. Replacing "the" occurrence would
 * leave the other half of the page saying the opposite, and a presence test
 * would still pass — so the number is asserted, not the presence.
 */
/**
 * Replace `from` with `to`, with no "already patched" shortcut.
 *
 * sub() decides it has already run by looking for `to` in the page, which is
 * wrong whenever `to` is empty or is ordinary markup like a closing tag —
 * every page contains those, so sub() reads itself as done and silently
 * changes nothing. Patching always starts from the pristine page, so here a
 * missing `from` is a real failure rather than a second run.
 */
function rewrite(html, from, to, label) {
  if (!html.includes(from)) { failures.push(label); return html; }
  return html.replace(from, to);
}

function subAll(html, from, to, count, label) {
  if (html.includes(to) && !html.includes(from)) return html;   // already patched
  const found = html.split(from).length - 1;
  if (found !== count) { failures.push(`${label} (${found} of ${count})`); return html; }
  return html.split(from).join(to);
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
} else if (fs.existsSync(SOURCE) && html.includes('id="bali-property-investment"')) {
  // --check has to run the patch pass over the same source a real run would,
  // and only skip the write. It used to run it over the finished page instead,
  // where every *deletion* — the calculator's nested <!DOCTYPE>, its stray
  // </body> — is already gone, so each one recorded a failure. Those failures
  // were then never printed, which is the only reason nobody noticed.
  html = fs.readFileSync(SOURCE, 'utf8');
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
    + `<span class="${MARK}-h1-eyebrow">${esc(COPY.h1_eyebrow)}</span> `
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
// 4g. /early-bird/ is the third URL in the sitemap. It is a straight mirror of
//     the WordPress page, so everything Google reads about it is fixed up here.
//
//     Rank Math had built its social description out of an auto-excerpt, which
//     is why it shipped with a literal `<a class="read-more">` tag and a "..."
//     inside a meta tag. The title ran to 103 characters and the description to
//     162, both past what Google shows. Replacement copy written by Fable 5.
//
//     This page is patched in place rather than from a pristine copy, so every
//     edit below has to be idempotent: rewriteEarly() is a no-op once its own
//     output is present, and reports a failure only when neither the old nor
//     the new text is there.
// ---------------------------------------------------------------------------
const EARLY = path.join(ROOT, 'public', 'early-bird', 'index.html');
const EARLY_URL = 'https://azuralivingbali.com/early-bird/';
const EARLY_META = {
  title: 'Save $69,000: Early Investor Villas in Bali | Azura Living',
  description: 'The next 2 villas at Azura Living, Tabanan are 15% off for early '
    + 'investors: $391,000 instead of $460,000. Projected returns of up to 18.1% a year.',
  ogTitle: 'Save $69,000 as an Early Investor at Azura Living Bali',
  ogDescription: 'Two 4-bedroom wellness villas in Tabanan, Bali are open to early '
    + 'investors at $391,000 instead of $460,000. Projected returns of up to 18.1% a '
    + 'year, with flexible payment terms.',
};

if (fs.existsSync(EARLY)) {
  let early = fs.readFileSync(EARLY, 'utf8');
  const before = early;
  const earlyFailures = [];

  // Two things this must get right, both learned the hard way elsewhere in this
  // file. A replacement string is never handed to .replace() directly: every one
  // of these carries a dollar sign, and "$391,000" in a replacement means
  // capture group 3. And --check asserts the *value*, not that a replace
  // happened: /<title>.*?<\/title>/ matches any title at all, so "the replace
  // succeeded" would report a clean run on completely wrong copy.
  const rewriteEarly = (re, value, label) => {
    if (early.includes(value)) return;
    const out = early.replace(re, () => value);
    if (out === early) { earlyFailures.push(`${label} (nothing to patch)`); return; }
    if (CHECK) { earlyFailures.push(label); return; }
    early = out;
  };

  if (!early.includes(`<link rel="canonical" href="${EARLY_URL}">`)) {
    rewriteEarly(
      /<meta name="robots"/,
      `<link rel="canonical" href="${EARLY_URL}">\n<meta name="robots"`,
      'early-bird canonical'
    );
  }

  // The rest of the site declares en-GB. This page was the only en-US left.
  // In --check these repair themselves in memory unless they are gated, and a
  // check that repairs what it is checking always passes.
  if (/<html[^>]*lang="en-US"/i.test(early) || early.includes('content="en_US"')) {
    if (CHECK) earlyFailures.push('early-bird lang');
    else {
      early = early.replace(/(<html[^>]*)lang="en-US"/i, (m, head) => `${head}lang="en-GB"`);
      early = early.split('content="en_US"').join('content="en_GB"');
    }
  }
  if (!/<html[^>]*lang="en-GB"/i.test(early)) earlyFailures.push('early-bird lang missing');

  rewriteEarly(/<title>[\s\S]*?<\/title>/, `<title>${esc(EARLY_META.title)}</title>`, 'early-bird title');
  rewriteEarly(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${esc(EARLY_META.description)}">`,
    'early-bird description'
  );
  rewriteEarly(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${esc(EARLY_META.ogTitle)}"`,
    'early-bird og:title'
  );
  rewriteEarly(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${esc(EARLY_META.ogDescription)}"`,
    'early-bird og:description'
  );
  rewriteEarly(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${esc(EARLY_META.ogTitle)}"`,
    'early-bird twitter:title'
  );
  rewriteEarly(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${esc(EARLY_META.ogDescription)}"`,
    'early-bird twitter:description'
  );

  // Same correction as the home page: no foreigner can hold Hak Milik, and the
  // villas are sold on an extendable lease. Three identical spec lines here.
  if (early.includes('Extendable 80 years freehold')) {
    if (CHECK) earlyFailures.push('early-bird lease wording');
    else early = early.split('Extendable 80 years freehold').join('Extendable 80-year villa lease');
  }
  const earlyFreehold = (early.match(/freehold/gi) || []).length;
  if (earlyFreehold) earlyFailures.push(`early-bird "freehold" survives (${earlyFreehold}x)`);

  failures.push(...earlyFailures);
  if (!CHECK && early !== before) fs.writeFileSync(EARLY, early);
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

// ---------------------------------------------------------------------------
// 5. "Freehold", in five places.
//
//    The section we add says plainly that no foreigner can hold Hak Milik,
//    Indonesia's freehold title, because the law reserves it for Indonesian
//    citizens. The client's older copy called the same villas freehold in five
//    places, so the page contradicted itself and the wrong half was the
//    marketing, not the law. What the client actually sells is an extendable
//    80-year lease.
//
//    Every figure the client quotes is kept. Only the legal word changes, and
//    the returns figure stops reading as a promise. Written by Fable 5.
// ---------------------------------------------------------------------------
const WC = '<div class="elementor-widget-container">\n\t\t\t\t\t\t\t\t\t';
const WE = '\t\t\t\t\t\t\t\t</div>';

// Once, in the visible text widget. The unpatched page has this line three
// times, but the other two are inside the meta description this script has
// already rewritten by the time it gets here.
html = subAll(
  html,
  'Secure Your Freehold Villa in Bali&#8217;s Next Hotspot',
  'Secure Your Leasehold Villa in Bali&#8217;s Next Hotspot',
  1,
  'hero freehold line'
);

// The stat strip reads "Up to / 80 / yrs / <label>" and "Up to / 18% / <label>".
html = subAll(html, `${WC}Freehold Ownership${WE}`, `${WC}Extendable Lease${WE}`,
  1, 'stat label: ownership');
html = subAll(html, `${WC}Annual Returns${WE}`, `${WC}Projected Annual Return${WE}`,
  1, 'stat label: returns');

html = subAll(html, 'Freehold titles up to 80 years', 'Leasehold terms up to 80 years',
  1, 'benefits bullet');
html = subAll(html, 'Extendable 80 years Freehold ownership', 'Extendable 80-year villa lease',
  1, 'spec line (upper)');
html = subAll(html, 'Extendable 80 years freehold ownership', 'Extendable 80-year villa lease',
  1, 'spec line (lower)');

// The one-word spec label, once in the desktop block and once in the mobile one.
html = subAll(html, `${WC}Freehold${WE}`, `${WC}80-Year Lease${WE}`, 2, 'spec label');

// "ROI up to 18% p.a." stated a return as fact on a page that now says returns
// are never promised. Same figure, no promise.
html = subAll(html, `${WC}ROI up to 18% p.a.${WE}`, `${WC}Projected ROI up to 18% p.a.${WE}`,
  2, 'ROI card');

// ---------------------------------------------------------------------------
// 6. The ROI calculator was a whole second HTML document.
//
//    It had been pasted into an Elementor HTML widget complete with its own
//    <!DOCTYPE>, <html>, <head>, <title> and <body> — in the middle of the
//    page. The page therefore carried two <title> elements, and the stray
//    </body></html> put every tag after it into the parser's after-body mode.
//    The calculator's own markup, styles and script are fine; only the wrapper
//    has to go, and nothing moves, because each tag is removed in place.
//
//    Its Tailwind build also came from jsdelivr at run time, which is a third
//    party watching every visitor arrive. It is now served from this site.
// ---------------------------------------------------------------------------
html = rewrite(
  html,
  '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    \n'
    + '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
    + '    <title>Azura ROI Calculator</title>\n',
  '',
  'calculator: nested doctype and title'
);
html = rewrite(html, '</head>\n\n  <body class="bg-black text-white">', '',
  'calculator: nested head and body tags');
html = rewrite(html, '</body>\n</html>\n\t\t\t\t</div>', '\t\t\t\t</div>',
  'calculator: nested closing tags');
//    The tag it came in on was also a WP Rocket "load this once the visitor
//    interacts" script. Every one of the calculator's own styles is a Tailwind
//    utility class, so until someone moved a mouse the calculator rendered
//    unstyled: no dark panel, no rounded corners, sliders at full page width.
//    It now loads itself when the calculator comes within 600px of the screen,
//    which is deterministic, still costs nothing to a visitor who never scrolls
//    that far, and no longer depends on a plugin's guess about interaction.
html = rewrite(
  html,
  '<script type="rocketlazyloadscript" data-rocket-src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" data-rocket-defer defer></script>',
  `<script id="azura-tailwind-loader">
(function () {
  var done = false;
  function load() {
    if (done) return;
    done = true;
    var s = document.createElement('script');
    s.src = '/${TAILWIND_PATH}';
    document.head.appendChild(s);
  }
  function start() {
    var target = document.getElementById('calculator');
    if (!target || !('IntersectionObserver' in window)) return load();
    new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { obs.disconnect(); load(); return; }
      }
    }, { rootMargin: '600px' }).observe(target);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
})();
</script>`,
  'calculator: self-hosted Tailwind'
);

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
    // The two H1 spans are both display:block, so a space between them renders
    // as nothing — but without it every text extractor, Google's included,
    // reads the heading as one word: "Azura LivingBoutique Villas".
    ['h1 word break', `</span> <span class="${MARK}-h1-main">`],
    ['main landmark', MAIN_OPEN],
    ['main closed', '</main>'],
    ['content section', 'id="bali-property-investment"'],
    ['stylesheet link', `id="${MARK}-css"`],
    ['calculator anchor', 'id="calculator"'],
    ['calculator styling', 'id="azura-tailwind-loader"'],
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

  // Nothing on the page may call a foreign buyer's villa freehold, and the
  // returns figure may not stand on its own. Both of these are counted, not
  // looked for: the strings sit in the page twice, desktop and mobile, and one
  // surviving copy is exactly the failure a presence test cannot see.
  // Our own section is cut out first. It uses the word correctly and often —
  // "Indonesian law reserves freehold title, called Hak Milik, for Indonesian
  // citizens" is the whole point of the page. What must not survive is the
  // client's older copy calling a foreign buyer's villa freehold.
  const clientCopy = current.replace(
    /<section class="azura-invest" id="bali-property-investment"[\s\S]*?<\/section>/,
    ''
  );
  const freehold = (clientCopy.match(/[Ff]reehold/g) || []).length;
  if (freehold) missing.push(`"freehold" still in the client copy (${freehold}x)`);
  const bareRoi = (current.match(/(?<!Projected )ROI up to 18% p\.a\./g) || []).length;
  if (bareRoi) missing.push(`unqualified ROI claim (${bareRoi}x)`);

  // The calculator's wrapper. Two <title> elements in one document is the tell.
  const titles = (current.match(/<title[ >]/g) || []).length;
  if (titles !== 1) missing.push(`<title> elements (${titles}, expected 1)`);
  const doctypes = (current.match(/<!DOCTYPE/gi) || []).length;
  if (doctypes !== 1) missing.push(`<!DOCTYPE> (${doctypes}, expected 1)`);
  const bodies = (current.match(/<\/body>/gi) || []).length;
  if (bodies !== 1) missing.push(`</body> (${bodies}, expected 1)`);

  // No third party may be called at run time. Commented-out markup is cut
  // first: an earlier build left two <!-- --> select2 tags in the page, and a
  // comment fetches nothing.
  const liveMarkup = current.replace(/<!--[\s\S]*?-->/g, '');
  const cdn = (liveMarkup.match(/src="https?:\/\/cdn\.jsdelivr\.net[^"]*"/g) || []).length;
  if (cdn) missing.push(`live jsdelivr script (${cdn}x)`);
  const tw = path.join(ROOT, 'public', TAILWIND_PATH);
  if (!fs.existsSync(tw)) missing.push(`Tailwind build (public/${TAILWIND_PATH})`);
  else if (fs.statSync(tw).size < 100_000) missing.push('Tailwind build looks truncated');
  // Everything the patch pass itself could not apply. This block used to exit
  // before `failures` was ever read, so --check reported a clean run while the
  // patch pass had already given up on an edit — including every check on
  // /early-bird/, which is patched in place up in section 4g rather than here.
  missing.push(...failures);

  if (missing.length) {
    console.error('MISSING: ' + missing.join(', '));
    process.exit(1);
  }
  console.log(
    `OK — all ${musts.length} SEO edits present in public/index.html, `
      + 'and /early-bird/ carries its own title, description and lease wording'
  );
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
