#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const CHECK = process.argv.includes('--check');
const MEASUREMENT_ID = 'G-Q8P7PZWE38';

const ALEX_SNIPPET = `
<!-- Google Analytics 4 (Alex / Digital Movement) -->
<script async data-azura-ga4 src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
<script data-azura-ga4>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${MEASUREMENT_ID}');document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.href||'';var kind=h.indexOf('wa.me/')>-1?'whatsapp':h.indexOf('widget/bookings/')>-1?'booking':h.indexOf('.pdf')>-1?'brochure':null;if(kind)gtag('event','generate_lead',{lead_source:kind,link_url:h,transport_type:'beacon'});},true);document.addEventListener('submit',function(e){gtag('event','generate_lead',{lead_source:'form',form_name:(e.target&&e.target.getAttribute('name'))||'website_form',transport_type:'beacon'});},true);</script>
`;

function clean(html) {
  let output = html
    .replace(
      /<!-- Google tag \(gtag\.js\) snippet added by Site Kit -->\s*<!-- Google Analytics snippet added by Site Kit -->\s*<script id="google_gtagjs-js"[\s\S]*?<\/script>\s*<script id="google_gtagjs-js-after">[\s\S]*?<\/script>\s*/g,
      '',
    )
    .replace(
      /<!-- Google Tag Manager snippet added by Site Kit -->[\s\S]*?<!-- End Google Tag Manager snippet added by Site Kit -->\s*/g,
      '',
    )
    .replace(
      /<!-- Google Tag Manager \(noscript\) snippet added by Site Kit -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) snippet added by Site Kit -->\s*/g,
      '',
    )
    .replace(/<meta name="generator" content="Site Kit by Google [^"]*"\s*\/?>/g, '')
    .replace(/<link rel=['"]dns-prefetch['"] href=['"]\/\/(?:www\.|ssl\.)?google-analytics\.com['"]\s*\/?>\s*/gi, '')
    .replace(
      /<!-- Google Analytics 4 \((?:Digital Movement|Alex \/ Digital Movement)\) -->\s*<script[^>]*G-Q8P7PZWE38[^>]*><\/script>\s*<script[^>]*>[\s\S]*?gtag\(['"]config['"],['"]G-Q8P7PZWE38['"]\);[\s\S]*?<\/script>\s*/g,
      '',
    );

  if (!output.includes('data-azura-ga4')) {
    output = output.replace(/(<meta charset=["']UTF-8["']>)/i, `$1${ALEX_SNIPPET}`);
  }
  return output;
}

function htmlFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(target);
  }
  return found;
}

const files = htmlFiles(PUBLIC);
const pristine = path.join(__dirname, '.pristine-index.html');
if (fs.existsSync(pristine)) files.push(pristine);

let changed = 0;
const failures = [];
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = clean(before);
  const relative = path.relative(ROOT, file);
  if (after !== before) {
    changed += 1;
    if (!CHECK) fs.writeFileSync(file, after);
  }
  const inspected = CHECK ? before : after;
  if (/GT-PZQ3SZLX|GTM-TVBJTJL3|G-KTXMT3WMCR/.test(inspected)) failures.push(`${relative}: legacy Google tag remains`);
  const ids = [...inspected.matchAll(/\bG-[A-Z0-9]{6,}\b/g)].map((match) => match[0]);
  if (ids.some((id) => id !== MEASUREMENT_ID)) failures.push(`${relative}: non-Alex GA4 ID remains`);
  const isUtilityPage = relative.startsWith('public/recovery/') || /^public\/google[^/]+\.html$/.test(relative);
  if (!isUtilityPage && !inspected.includes(`gtag('config','${MEASUREMENT_ID}')`)) {
    failures.push(`${relative}: Alex GA4 config missing`);
  }
}

if (CHECK && changed) failures.push(`${changed} HTML file(s) still need analytics cleanup`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`${CHECK ? 'OK' : 'Cleaned'} — ${files.length} HTML files use only ${MEASUREMENT_ID}`);
