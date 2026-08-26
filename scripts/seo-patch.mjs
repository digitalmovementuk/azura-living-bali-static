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

// The client's one contact number, confirmed by the client on 2026-08-26:
// +62 823-2284-6087. It is also the number the page's own brochure buttons
// already dial, so every use of it — the tel: link, the WhatsApp chip, the
// brochure link and the label a visitor reads — is built from this constant
// and the four cannot drift apart.
//
// Both social profiles still publish an older number, +62 812-4196-0867. That
// is a client fix on their side, not a patch; it is flagged in README.md.
const PHONE_E164 = '+6282322846087';
const PHONE_DISPLAY = '+62 823-2284-6087';
const PHONE_URL = `tel:${PHONE_E164}`;
const WHATSAPP_URL = `https://wa.me/${PHONE_E164.slice(1)}`;

// The site's own brochure link, copied from its three "Download Brochure"
// buttons. There is an Elementor brochure form in the page source, but it sits
// inside a popup template that never reaches the DOM, so an anchor to it is a
// dead link. WhatsApp is the route the client actually built.
const BROCHURE_URL =
  `${WHATSAPP_URL}?text=Hi%2C%20could%20you%20please%20share%20the%20Azura%20brochure%20with%20me%3F`;

// The ROI calculator's Tailwind build, taken off jsdelivr and served from here.
// Refresh it with:
//   curl -sL -o public/assets/js/tailwind-browser-4.js \
//     https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4
const TAILWIND_PATH = 'assets/js/tailwind-browser-4.js';

// The brand's own social profiles. Both were opened in a browser before being
// written down: the Instagram bio carries the villa spec word for word, and the
// Facebook Page's own link, azuraboutiquevillas.com, 301s to this site. That
// redirect is the only hard proof the accounts belong to this brand.
//
// Facebook has two accounts for the same villas: this business Page, and a
// personal profile at /azura.living.bali. The Page is what `sameAs` should
// name, because sameAs identifies the organisation, not a person. The
// duplicate is a client decision, flagged in README.md.
//
// The numeric form facebook.com/61576953297102 returns HTTP 400 for this Page.
// Only the /p/<slug>-<id>/ form resolves. Do not "tidy" this URL.
const FACEBOOK_URL = 'https://www.facebook.com/p/Azura-Living-Bali-61576953297102/';
const INSTAGRAM_URL = 'https://www.instagram.com/azura_living_bali/';

// The share image, built by scripts/build-brand-assets.py. The mirror shipped a
// stray WhatsApp photo at 1214x788 — wrong aspect for a 1.91:1 card, no brand
// on it — and /early-bird/ declared 900x563 for a file that is not that size.
// Declared dimensions are read from the constants below in both places, so the
// two can no longer disagree.
const OG_IMAGE = 'https://azuralivingbali.com/assets/images/azura-og.jpg';
const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;
const OG_IMAGE_OLD =
  'https://azuralivingbali.com/wp-content/uploads/2025/05/WhatsApp-Image-2025-05-23-at-12.02.00-PM.jpeg';

// Icon set, also from build-brand-assets.py. Every one of these tags used to
// point at Azura_White_Logo__No_Background_.png: a 512x273 white wordmark on
// transparency. Not square, and white on Google's white result page — which is
// why the SERP showed an empty circle where the favicon belongs.
const ICON_LINKS =
  '<link rel="icon" href="/favicon.ico" sizes="any">\n'
  + '<link rel="icon" type="image/png" href="/assets/brand/favicon-96.png" sizes="96x96">\n'
  + '<link rel="icon" type="image/png" href="/assets/brand/favicon-192.png" sizes="192x192">\n'
  + '<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">\n'
  + '<link rel="manifest" href="/site.webmanifest">\n'
  + '<meta name="theme-color" content="#2C2C2C">';

// Simple Icons paths, drawn at 24x24 and coloured with currentColor so one
// rule covers the bar, the drawer and the footer. The handset is Material
// Symbols' "call" at the same 24x24, so the four glyphs share an optical
// weight; a thin outline phone beside three solid marks reads as a mistake.
const SOCIAL_SVG = {
  WhatsApp:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94'
    + ' 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198'
    + ' 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195'
    + ' 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421'
    + ' 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03'
    + ' 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547'
    + ' 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>',
  Phone:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57'
    + ' 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  Facebook:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M22 12.06C22 6.5'
    + ' 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52'
    + ' 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45'
    + ' 2.9h-2.33V22c4.78-.79 8.44-4.93 8.44-9.94z"/></svg>',
  Instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.16c3.2 0 3.58.01'
    + ' 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41'
    + ' 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9'
    + ' 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68'
    + ' 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07'
    + ' 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14c-.3.76-.5 1.64-.56'
    + ' 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91a5.9 5.9 0 0 0 1.38'
    + ' 2.13 5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01'
    + ' 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0'
    + ' 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9'
    + ' 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12'
    + ' 0z"/><path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84M12 16a4 4 0 1 1 4-4'
    + ' 4 4 0 0 1-4 4z"/><path d="M18.41 4.15a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0'
    + ' 0-1.44-1.44z"/></svg>',
};

/**
 * The wrapper's opening tag. Used as the marker that says "these links are
 * already on this page", so it must be a string the stylesheet cannot contain:
 * `azura-invest-social--header` on its own is also the name of a CSS rule, and
 * matching that made the idempotence check pass before the links were inserted.
 */
const socialOpen = (place) => `<div class="${MARK}-social ${MARK}-social--${place}">`;

/**
 * The four chips, in the order they are painted: the two ways to start a
 * conversation, then the two profiles. WhatsApp and the phone go first because
 * they are what the page is for — every call-to-action on it ends in a chat —
 * and a row is read left to right.
 *
 * The dialler opens in the page that is already loaded, so `tel:` gets no
 * target="_blank": a new tab would be left behind, blank, after the call.
 * `rel="noopener"` goes with every target we do open.
 *
 * The labels are what a screen reader announces, and they are not
 * interchangeable with the profile ones: "Azura Living Bali on WhatsApp" would
 * describe a profile page, when the link starts a message. The number is read
 * out in full, so someone who cannot use the link can still write it down.
 */
const CHIPS = [
  { icon: 'WhatsApp', href: WHATSAPP_URL, blank: true,
    title: 'WhatsApp', label: 'Message Azura Living Bali on WhatsApp' },
  { icon: 'Phone', href: PHONE_URL, blank: false,
    title: PHONE_DISPLAY, label: `Call Azura Living Bali on ${PHONE_DISPLAY}` },
  { icon: 'Facebook', href: FACEBOOK_URL, blank: true,
    title: 'Facebook', label: 'Azura Living Bali on Facebook' },
  { icon: 'Instagram', href: INSTAGRAM_URL, blank: true,
    title: 'Instagram', label: 'Azura Living Bali on Instagram' },
];

/** All four chips, as one block. `place` is 'header', 'menu' or 'footer'. */
function socialBlock(place) {
  const link = (c) =>
    `<a class="${MARK}-social-link ${MARK}-social-link--${c.icon.toLowerCase()}"`
    + ` href="${c.href}"` + (c.blank ? ' target="_blank" rel="noopener"' : '')
    + ` aria-label="${c.label}" title="${c.title}">${SOCIAL_SVG[c.icon]}</a>`;
  return socialOpen(place) + CHIPS.map(link).join('') + '</div>';
}

// Kept in a <style> rather than in azura-invest.css because /early-bird/ never
// links that stylesheet, and these two links have to look the same on all three
// pages. The header copy is hidden below 1024px: at that width the bar has
// already collapsed to the burger, and the brief was desktop only. The footer
// copy is on every breakpoint.
const SOCIAL_CSS =
  `<style id="${MARK}-social-css">`
  // Size and glyph come from two custom properties so that one rule can retune
  // the whole chip. The bar and the menu match the page's own menu button;
  // the footer keeps the smaller chip, where nothing sits beside it.
  + `.${MARK}-social{display:flex;align-items:center;gap:10px;--chip:34px;--glyph:15px}`
  // The chip is opaque, and both colours are set outright rather than
  // inherited. Two reasons, both measured rather than assumed:
  //
  // The bar is transparent over whatever the page starts with, and that ranges
  // from a near-white panel on the guide (luminance 197 of 255) to a dark hero
  // photo. White on the lightest of those is 1.3:1 — invisible. A solid
  // #2C2C2C chip holds white at about 14:1 whatever is behind it, and it is
  // the same charcoal-and-white pairing the favicon uses.
  //
  // And the theme hands no colour down to an <a>, so leaving the ring and the
  // glyph to inherit currentColor painted both the browser's default link blue.
  //
  // Two class names, not one. Inside the drawer these links are also matched by
  // the page's own `.menu-content a`, which is a class plus an element and so
  // outranks a single class: on /early-bird/ that rule was giving them 13px of
  // padding, an underline-style bottom border and a 15px slide on hover.
  + `.${MARK}-social .${MARK}-social-link{box-sizing:border-box;display:inline-flex;`
  + `align-items:center;justify-content:center;width:var(--chip);height:var(--chip);`
  + `padding:0;margin:0;border-radius:50%;border:1px solid rgba(255,255,255,.28);`
  + `background:#2C2C2C;color:#fff;text-decoration:none;flex:0 0 auto;`
  + `transition:background-color .2s ease,border-color .2s ease,color .2s ease}`
  // WhatsApp is the only chip that is not charcoal, so the row reads as
  // "message us, call us, then the profiles" rather than as four identical
  // circles. The phone keeps the charcoal chip: two coloured chips side by
  // side would be two things shouting, and the green is doing the work.
  //
  // #49E670 is not a colour chosen here. It is the exact green of the floating
  // WhatsApp bubble the client's own page already paints, bottom right, on
  // every screen — read out of that widget's inline SVG. A second, tidier
  // green would have put two different WhatsApp buttons on the same phone
  // screen, which is the one thing a visitor would actually notice. The render
  // gate reads the bubble's fill off the page and fails if the two drift.
  //
  // It is also the one chip that does not clear 4.5:1 on its glyph — white on
  // this green is 1.7:1. That is the WhatsApp mark in WhatsApp's own colours,
  // the pairing the bubble beside it already uses, and recolouring a logo to
  // pass a contrast rule makes it stop being the logo. The other three chips
  // are held to 4.5:1 as before.
  //
  // The ring goes dark here. A white 28% ring is invisible on a light green
  // chip, so the disc would have lost the edge the other three have.
  //
  // The hover rule below carries a pseudo-class and so outranks this one; the
  // green chip turns gold on hover with the other three.
  + `.${MARK}-social .${MARK}-social-link--whatsapp{background:#49E670;`
  + `border-color:rgba(0,0,0,.16)}`
  + `.${MARK}-social .${MARK}-social-link:hover,.${MARK}-social .${MARK}-social-link:focus-visible`
  + `{background:#D1A30A;border-color:#D1A30A;color:#2C2C2C;opacity:1;transform:none}`
  + `.${MARK}-social .${MARK}-social-link svg{width:var(--glyph);height:var(--glyph);`
  + `fill:currentColor;display:block}`
  // The bar. Three numbers, all read off the rendered page rather than guessed:
  //
  // 48px is the size of the menu button next to them, so the three controls in
  // the bar are one set. `top:1px` lines their centres up with it — the column
  // they sit in starts one pixel higher than the button.
  //
  // The 48px indent clears the menu button itself. That button is
  // position:fixed at z-index 1000002 and sits over the left of the bar, so the
  // first chip was underneath it and unclickable — visible on a screenshot,
  // invisible to every measurement that only asked where the links were.
  + `.${MARK}-social--header{--chip:48px;--glyph:20px;position:relative;top:1px;margin-left:48px}`
  // Below 1024px the bar has already collapsed to the menu button, so the bar
  // copy goes away and the drawer copy takes over.
  + `@media (max-width:1024px){.${MARK}-social--header{display:none}}`
  // In the drawer. On the home page and the guide the parent is the contact
  // panel, a flex column whose three children are ordered 1-3, so order:4 puts
  // these last, under the WhatsApp line, and they fade in with the panel.
  + `.${MARK}-social--menu{--chip:48px;--glyph:20px;order:4;align-self:center;`
  + `justify-content:center;gap:14px;margin:20px 0 0}`
  // /early-bird/ is a landing page without navigation. The client's own page
  // CSS hides that whole widget — the button and the drawer behind it — at
  // every width, so there is no menu button to match and no drawer to sit in.
  // The chips keep the site's 48px size and line their centres up with the
  // wordmark instead. The offset is measured with the chips already in place:
  // they sit in the flow, so their own height moves the wordmark down with
  // them, and an offset read off the page before the change lands 4px out.
  + `.elementor-page-3556 .${MARK}-social--header{top:10px}`
  + `.${MARK}-social--footer{justify-content:center;margin:22px 0 2px}`
  + '</style>';

// The empty left column of the fixed bar.
//
// The bar has three columns: this one, the centred logo, and a right-hand
// column holding a "Get in Touch" button. The right-hand column is the obvious
// slot and it is the wrong one — the client's own CSS gives it opacity:0, on
// the live site as well as here, so everything inside it is invisible while
// still answering hit-tests. Links put there measured as present, visible and
// correctly coloured, and could not be seen on a screenshot.
//
// This column is genuinely empty (height 0), sits at the left edge of the bar,
// and balances the hidden column on the right.
const HEADER_SLOT =
  '<div class="elementor-element elementor-element-ab14076 e-con-full e-flex e-con e-child"'
  + ' data-id="ab14076" data-element_type="container" data-e-type="container">';
// The footer's bottom row, under the copyright line.
const FOOTER_SLOT = '<div class="dm-powered-by"';
// The last line inside the drawer's contact panel. Below 1024px the bar copy
// is hidden, so on a phone this is the only place the profiles appear above
// the fold — the drawer is the site's navigation there.
const MENU_SLOT = 'Message the team</a>';

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
// 1b. Favicon, share image and the two social links.
//
//     The favicon tags are removed by count, not by exact string: there are
//     four of them (two <link rel=icon>, one apple-touch-icon, one
//     msapplication-TileImage) and their whitespace comes from WordPress, so
//     matching the block verbatim would break the next time the mirror is
//     re-taken. Four is asserted; three or five is a failure.
// ---------------------------------------------------------------------------
const ICON_TAG = /<(?:link|meta)[^>]*Azura_White_Logo__No_Background_[^>]*>\s*/g;
const brokenIcons = (html.match(ICON_TAG) || []).length;
if (brokenIcons !== 4) failures.push(`old favicon tags (${brokenIcons} of 4)`);
html = html.replace(ICON_TAG, '');
html = rewrite(
  html,
  `<link rel="canonical" href="${CANONICAL}">`,
  `<link rel="canonical" href="${CANONICAL}">\n${ICON_LINKS}\n${SOCIAL_CSS}`,
  'icon block'
);

// og:image, og:image:secure_url and twitter:image all carry the same URL.
html = subAll(html, OG_IMAGE_OLD, OG_IMAGE, 3, 'share image url');
html = html.replace(
  /<meta property="og:image:width" content="[^"]*" \/>/,
  `<meta property="og:image:width" content="${OG_IMAGE_W}" />`
);
html = html.replace(
  /<meta property="og:image:height" content="[^"]*" \/>/,
  `<meta property="og:image:height" content="${OG_IMAGE_H}" />`
);
for (const [label, needle] of [
  ['og:image:width', `<meta property="og:image:width" content="${OG_IMAGE_W}" />`],
  ['og:image:height', `<meta property="og:image:height" content="${OG_IMAGE_H}" />`],
]) {
  if (!html.includes(needle)) failures.push(label);
}
// Twitter shows og:image:alt as the card's alt text only if it is repeated
// here; without it a screen reader announces the card as an unnamed image.
if (!html.includes('name="twitter:image:alt"')) {
  html = rewrite(
    html,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />\n`
      + `<meta name="twitter:image:alt" content="${esc(COPY.og_image_alt)}" />`,
    'twitter:image:alt'
  );
}

// The two profile links: desktop bar, then footer.
html = rewrite(html, HEADER_SLOT, HEADER_SLOT + socialBlock('header'), 'header social links');
html = rewrite(html, FOOTER_SLOT, socialBlock('footer') + FOOTER_SLOT, 'footer social links');
html = rewrite(html, MENU_SLOT, MENU_SLOT + socialBlock('menu'), 'menu social links');

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
      image: OG_IMAGE,
      // The profiles Google can use to tie this site to the brand's other
      // accounts. Only the Facebook Page is listed, not the duplicate personal
      // profile: sameAs is for the organisation.
      sameAs: [FACEBOOK_URL, INSTAGRAM_URL],
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
      primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMAGE, width: OG_IMAGE_W, height: OG_IMAGE_H },
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

  // Icons, share image and the two social links — the same treatment the home
  // page gets in section 1b, written for a page that is patched in place.
  //
  // insertEarly() puts a block on the page once, and then keeps it current.
  //
  // The obvious version — "if the marker is already there, do nothing" — is
  // idempotent but wrong: it makes the first insertion permanent. Changing the
  // stylesheet afterwards left this page painting its icons the browser's
  // default blue while the two pages built from pristine had already been
  // corrected, because the no-op branch never looked at what it had inserted.
  //
  // So: replace the old block when one is found, insert when none is, and do
  // nothing when what is there already matches. `region` is a function that
  // returns the existing block's extent, or null.
  // `region` must describe exactly the span `block` occupies — otherwise the
  // comparison never matches and the page is reported out of date on every
  // run. The anchor is therefore never part of the block: `where` says which
  // side of it the block goes on.
  const insertEarly = (region, anchor, block, where, label) => {
    const found = region(early);
    if (found === block) return;
    if (CHECK) { earlyFailures.push(found === null ? label : `${label} (out of date)`); return; }
    if (found !== null) { early = early.replace(found, () => block); return; }
    if (!early.includes(anchor)) { earlyFailures.push(`${label} (no anchor)`); return; }
    early = early.replace(anchor, () => (where === 'before' ? `${block}\n${anchor}` : `${anchor}\n${block}`));
  };
  // The extent of a block that starts at a known opening tag and ends at the
  // first close of that kind. Safe for both blocks here: the <style> holds no
  // nested style, and the social wrapper holds only anchors and svg.
  const spanFrom = (open, close) => (src) => {
    const i = src.indexOf(open);
    if (i === -1) return null;
    const j = src.indexOf(close, i + open.length);
    return j === -1 ? null : src.slice(i, j + close.length);
  };

  const earlyBrokenIcons = (early.match(ICON_TAG) || []).length;
  if (earlyBrokenIcons) {
    if (CHECK) earlyFailures.push(`early-bird old favicon tags (${earlyBrokenIcons}x)`);
    else early = early.replace(ICON_TAG, '');
  }
  const EARLY_CANONICAL = `<link rel="canonical" href="${EARLY_URL}">`;
  const EARLY_ORG_ID = '"@id":"https://azuralivingbali.com/#organization"';
  insertEarly(
    spanFrom('<link rel="icon" href="/favicon.ico"', '</style>'),
    EARLY_CANONICAL,
    `${ICON_LINKS}\n${SOCIAL_CSS}`,
    'after',
    'early-bird icon block'
  );

  // This page pointed at a photo of the back facade, and declared it 900x563
  // when the file is named 1024x640. Both numbers now come from the same two
  // constants the home page uses, so they cannot drift apart again.
  const EARLY_OG_OLD =
    'https://azuralivingbali.com/wp-content/uploads/2025/07/4-fasad-belakang-1024x640.jpg';
  if (early.includes(EARLY_OG_OLD)) {
    const n = early.split(EARLY_OG_OLD).length - 1;
    if (n !== 3) earlyFailures.push(`early-bird share image url (${n} of 3)`);
    else if (CHECK) earlyFailures.push('early-bird share image url');
    else early = early.split(EARLY_OG_OLD).join(OG_IMAGE);
  }
  rewriteEarly(
    /<meta property="og:image:width" content="[^"]*" \/>/,
    `<meta property="og:image:width" content="${OG_IMAGE_W}" />`,
    'early-bird og:image:width'
  );
  rewriteEarly(
    /<meta property="og:image:height" content="[^"]*" \/>/,
    `<meta property="og:image:height" content="${OG_IMAGE_H}" />`,
    'early-bird og:image:height'
  );
  // The alt described the old photo of the back facade, so it has to move with
  // the image. Same wording as the home page, because it is the same picture.
  rewriteEarly(
    /<meta property="og:image:alt" content="[^"]*" \/>/,
    `<meta property="og:image:alt" content="${esc(COPY.og_image_alt)}" />`,
    'early-bird og:image:alt'
  );
  insertEarly(
    spanFrom('<meta name="twitter:image:alt"', '>'),
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<meta name="twitter:image:alt" content="${esc(COPY.og_image_alt)}" />`,
    'after',
    'early-bird twitter:image:alt'
  );

  // /early-bird/ keeps whatever was written into it last time, so moving the
  // slot — as happened when the right-hand column turned out to be invisible —
  // would otherwise leave the old copy behind in the old parent. Anything that
  // is not exactly where it belongs is removed first; the inserts below then
  // put a fresh copy in the right place. This covers a stale copy as well as a
  // misplaced one, since both fail the same comparison.
  for (const [place, anchor, where] of [
    ['header', HEADER_SLOT, 'after'],
    ['footer', FOOTER_SLOT, 'before'],
  ]) {
    const block = socialBlock(place);
    const correct = where === 'before' ? `${block}\n${anchor}` : `${anchor}\n${block}`;
    if (early.includes(correct)) continue;
    const found = spanFrom(socialOpen(place), '</div>')(early);
    if (found === null) continue;
    if (CHECK) { earlyFailures.push(`early-bird ${place} social links are misplaced`); continue; }
    early = early.includes(`\n${found}`)
      ? early.replace(`\n${found}`, '')
      : early.replace(found, '');
  }

  insertEarly(
    spanFrom(socialOpen('header'), '</div>'),
    HEADER_SLOT,
    socialBlock('header'),
    'after',
    'early-bird header social links'
  );
  insertEarly(
    spanFrom(socialOpen('footer'), '</div>'),
    FOOTER_SLOT,
    socialBlock('footer'),
    'before',
    'early-bird footer social links'
  );
  // No drawer block on this page. It is patched in place, so a block that was
  // added by an earlier run has to be taken out again rather than simply not
  // written: sitting in a drawer that never opens, it would be markup nobody
  // can ever see, and two of the render checks would have to be told to look
  // away. If the client switches the menu back on, the render gate fails and
  // says to put the block back.
  {
    const stale = spanFrom(socialOpen('menu'), '</div>')(early);
    if (stale !== null) {
      if (CHECK) earlyFailures.push('early-bird carries a drawer social block, but its drawer never opens');
      else early = early.includes(`\n${stale}`) ? early.replace(`\n${stale}`, '') : early.replace(stale, '');
    }
  }

  // This page carries its own Organization node, and it uses the same @id as
  // the one on the home page — so it is the same company, described twice. It
  // had no profiles on it, which would have left the two descriptions
  // disagreeing about where the company can be found.
  //
  // The names disagree too — "Azura Boutique Villas" here against "Azura
  // Living Bali" on the home page. That is the client's call, not a patch.
  {
    const want = `${EARLY_ORG_ID},"sameAs":${JSON.stringify([FACEBOOK_URL, INSTAGRAM_URL])}`;
    const escaped = EARLY_ORG_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = (early.match(new RegExp(`${escaped},"sameAs":\\[[^\\]]*\\]`)) || [])[0];
    if (found === want) {
      // already current
    } else if (CHECK) {
      earlyFailures.push(found ? 'early-bird sameAs (out of date)' : 'early-bird sameAs');
    } else if (found) {
      early = early.replace(found, () => want);
    } else if (early.includes(EARLY_ORG_ID)) {
      early = early.replace(EARLY_ORG_ID, () => want);
    } else {
      earlyFailures.push('early-bird organization node');
    }
  }

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
// 5b. Handover moves from Q1 2027 to Q1 2028.
//
//    Ayham, the owner, gave the instruction on 2026-08-26. Only the year
//    changes; the quarter framing is his own. The date sits in the client's
//    Elementor timeline twice, once in the desktop block and once in the
//    mobile one, and six more times in our copy (seo-copy.json four, plus the
//    guide page's guide-copy.json twice). Counted, not looked for: one
//    surviving 2027 is exactly the failure a presence test cannot see.
// ---------------------------------------------------------------------------
html = subAll(html, `${WC}Q1 2027${WE}`, `${WC}Q1 2028${WE}`, 2, 'handover date');

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
    ['favicon.ico', '<link rel="icon" href="/favicon.ico" sizes="any">'],
    ['apple touch icon', '<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">'],
    ['web manifest', '<link rel="manifest" href="/site.webmanifest">'],
    ['theme colour', '<meta name="theme-color" content="#2C2C2C">'],
    ['og:image', `<meta property="og:image" content="${OG_IMAGE}" />`],
    ['og:image:width', `<meta property="og:image:width" content="${OG_IMAGE_W}" />`],
    ['og:image:height', `<meta property="og:image:height" content="${OG_IMAGE_H}" />`],
    ['twitter:image', `<meta name="twitter:image" content="${OG_IMAGE}" />`],
    ['twitter:image:alt', '<meta name="twitter:image:alt"'],
    ['social stylesheet', `id="${MARK}-social-css"`],
    ['facebook link', FACEBOOK_URL],
    ['instagram link', INSTAGRAM_URL],
    ['whatsapp link', WHATSAPP_URL],
    ['phone link', PHONE_URL],
    // sameAs names profiles, and only profiles. A wa.me link and a tel: are
    // ways to reach the company, not other pages that are the company, so
    // they do not belong in this list however tempting the symmetry is.
    ['sameAs', `"sameAs":["${FACEBOOK_URL}","${INSTAGRAM_URL}"]`],
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

  // The handover year. Not one 2027 may survive, and all six 2028s must be
  // there: two in the client's Elementor timeline (desktop and mobile), one in
  // the JSON-LD offering description, one in the hero lede and two in the body
  // copy. Counted for the same reason as the two above — the strings sit in
  // the page more than once, and a single stale copy is what a presence test
  // walks straight past.
  const stale2027 = (current.match(/2027/g) || []).length;
  if (stale2027) missing.push(`stale 2027 handover date (${stale2027}x)`);
  const handover2028 = (current.match(/2028/g) || []).length;
  if (handover2028 !== 6) missing.push(`2028 handover dates (${handover2028} of 6)`);

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
  // The favicon, the share image and the two social links.
  //
  // Counted, not looked for. The old icon path was on the page four times and
  // the old share image three, so "the new one is present" would have reported
  // a clean run with the broken tags still sitting beside it — which is the
  // exact shape of the bug this section was written to fix.
  const strays = [
    ['old favicon path', 'Azura_White_Logo__No_Background_'],
    ['old share image', OG_IMAGE_OLD],
  ];
  for (const [label, needle] of strays) {
    const n = current.split(needle).length - 1;
    if (n) missing.push(`${label} still on the page (${n}x)`);
  }
  // One set of links in the bar, one in the drawer and one in the footer. Two would be the tell
  // that an insert ran twice; zero, that its idempotence marker matched
  // something it should not have — which is how the first version of this
  // silently skipped /early-bird/ because the marker was also a CSS rule name.
  // …and the right number of chips inside each of them. Counting the blocks
  // alone is not enough now that a block holds four links: adding a chip to
  // CHIPS but rebuilding only one of the three places would leave the block
  // count correct and two thirds of the page a version behind.
  const chipsIn = (src, place) => {
    const i = src.indexOf(socialOpen(place));
    if (i === -1) return -1;
    const j = src.indexOf('</div>', i);
    return src.slice(i, j).split(`class="${MARK}-social-link `).length - 1;
  };
  for (const place of ['header', 'footer', 'menu']) {
    const n = current.split(socialOpen(place)).length - 1;
    if (n !== 1) { missing.push(`${place} social links (${n}, expected 1)`); continue; }
    const c = chipsIn(current, place);
    if (c !== CHIPS.length) missing.push(`${place} chips (${c}, expected ${CHIPS.length})`);
  }

  // Every icon and image the head points at has to be a file that is actually
  // in public/. Read out of the markup rather than listed here, so renaming an
  // asset can never leave this gate checking a path the page no longer uses.
  const REFS = new Set();
  for (const m of current.matchAll(
    /<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="(\/[^"]+)"/g
  )) REFS.add(m[1]);
  REFS.add(new URL(OG_IMAGE).pathname);
  for (const ref of REFS) {
    const file = path.join(ROOT, 'public', ref.replace(/^\//, '').split('?')[0]);
    if (!fs.existsSync(file)) missing.push(`asset missing: public${ref}`);
    else if (fs.statSync(file).size < 400) missing.push(`asset looks empty: public${ref}`);
  }
  // The manifest names three more icons that nothing in the HTML links to, so
  // the loop above cannot see them. An installed home-screen icon that 404s is
  // a blank square, which is the failure this whole section is about.
  const MANIFEST = path.join(ROOT, 'public', 'site.webmanifest');
  if (fs.existsSync(MANIFEST)) {
    let icons = [];
    try {
      icons = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).icons || [];
    } catch { missing.push('site.webmanifest is not valid JSON'); }
    if (icons.length !== 3) missing.push(`manifest icons (${icons.length} of 3)`);
    if (!icons.some((i) => i.purpose === 'maskable')) missing.push('manifest maskable icon');
    for (const i of icons) {
      const f = path.join(ROOT, 'public', String(i.src).replace(/^\//, ''));
      if (!fs.existsSync(f)) missing.push(`manifest icon missing: public${i.src}`);
    }
  }

  // /early-bird/ gets the same treatment, asserted against the file that ships
  // rather than against what the patch pass believes it did.
  if (fs.existsSync(EARLY)) {
    const eb = fs.readFileSync(EARLY, 'utf8');
    const ebMusts = [
      ['favicon.ico', '<link rel="icon" href="/favicon.ico" sizes="any">'],
      ['web manifest', '<link rel="manifest" href="/site.webmanifest">'],
      ['og:image', `<meta property="og:image" content="${OG_IMAGE}" />`],
      ['og:image:width', `<meta property="og:image:width" content="${OG_IMAGE_W}" />`],
      ['twitter:image:alt', '<meta name="twitter:image:alt"'],
      ['social stylesheet', `id="${MARK}-social-css"`],
      ['facebook link', FACEBOOK_URL],
      ['instagram link', INSTAGRAM_URL],
      ['whatsapp link', WHATSAPP_URL],
      ['phone link', PHONE_URL],
    ];
    for (const [label, needle] of ebMusts) {
      if (!eb.includes(needle)) missing.push(`early-bird ${label}`);
    }
    const ebStray = eb.split('Azura_White_Logo__No_Background_').length - 1;
    if (ebStray) missing.push(`early-bird old favicon path (${ebStray}x)`);
    // None in the drawer here: see the note above the removal step.
    for (const [place, want] of [['header', 1], ['footer', 1], ['menu', 0]]) {
      const n = eb.split(socialOpen(place)).length - 1;
      if (n !== want) { missing.push(`early-bird ${place} social links (${n}, expected ${want})`); continue; }
      if (!want) continue;
      const c = chipsIn(eb, place);
      if (c !== CHIPS.length) missing.push(`early-bird ${place} chips (${c}, expected ${CHIPS.length})`);
    }
  }

  missing.push(...failures);

  if (missing.length) {
    console.error('MISSING: ' + missing.join(', '));
    process.exit(1);
  }
  console.log(
    `OK — all ${musts.length} SEO edits present in public/index.html, `
      + 'the icon set and share image resolve to real files, and /early-bird/ '
      + 'carries its own title, description, lease wording and social links'
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
