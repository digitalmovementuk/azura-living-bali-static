import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const origin = new URL("https://azuralivingbali.com");
const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "public");
const pages = ["/", "/early-bird/"];
const runtimeAssets = [
  "/wp-content/plugins/elementor/assets/css/conditionals/dialog.min.css?ver=4.1.5",
  "/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js?ver=4.9.3",
  "/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/text-editor.45609661e409413f1cef.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/image-carousel.6167d20b95b33386757b.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/video.86d44e46e43d0807e708.bundle.min.js",
  "/wp-content/plugins/elementor/assets/js/counter.12335f45aaa79d244f24.bundle.min.js",
  "/wp-content/plugins/elementor-pro/assets/js/slides.c0029640cbdb48199471.bundle.min.js",
];
const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36";
const queue = [];
const queued = new Set();
const failures = [];
let downloadedBytes = 0;

const replacements = new Map([
  [
    "/wp-content/uploads/2025/08/Azura-Hero-Sunset.mp4",
    "/assets/video/azura-hero-sunset-optimized.mp4",
  ],
  [
    "/wp-content/uploads\\/2025\\/08\\/Azura-Hero-Sunset.mp4",
    "/assets/video\\/azura-hero-sunset-optimized.mp4",
  ],
  ["https://azura-headless.netlify.app/maps", "/recovery/maps/"],
  ["https://azura-headless.netlify.app/silk", "/recovery/silk/"],
  ["https:\\/\\/azura-headless.netlify.app\\/maps", "/recovery/maps/"],
  ["https:\\/\\/azura-headless.netlify.app\\/silk", "/recovery/silk/"],
  [
    "https://api.leadconnectorhq.com/widget/bookings/azuradiscoverycall",
    "https://api.leadconnectorhq.com/widget/bookings/azura-discovery-call",
  ],
  [
    "https:\\/\\/api.leadconnectorhq.com\\/widget\\/bookings\\/azuradiscoverycall",
    "https:\\/\\/api.leadconnectorhq.com\\/widget\\/bookings\\/azura-discovery-call",
  ],
  ["9MOkUYwEMkdTPKuJXfZg", "Rkq1nXpJscgCq1JnSAGX"],
  ["https://azuralivingbali.com/wp-content/", "/wp-content/"],
  ["https://azuralivingbali.com/wp-includes/", "/wp-includes/"],
  ["https://www.azuralivingbali.com/wp-content/", "/wp-content/"],
  ["https://www.azuralivingbali.com/wp-includes/", "/wp-includes/"],
  ["https:\\/\\/azuralivingbali.com\\/wp-content\\/", "/wp-content/"],
  ["https:\\/\\/azuralivingbali.com\\/wp-includes\\/", "/wp-includes/"],
  ["https:\\/\\/www.azuralivingbali.com\\/wp-content\\/", "/wp-content/"],
  ["https:\\/\\/www.azuralivingbali.com\\/wp-includes\\/", "/wp-includes/"],
  [
    "https://www.azuraboutiquevillas.com/wp-content/uploads/elementor/google-fonts/fonts/",
    "/assets/fonts/",
  ],
]);

const premiumMenuStyles = String.raw`
html.azura-menu-open,
html.azura-menu-open body {
  overflow: hidden !important;
  overscroll-behavior: none;
}
.menu-wrapper .hamburger {
  top: max(16px, env(safe-area-inset-top)) !important;
  left: clamp(16px, 3vw, 34px) !important;
  width: 48px;
  height: 48px;
  margin: 0;
  padding: 0;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 999px;
  background: rgba(10, 13, 11, .26);
  box-shadow: 0 8px 28px rgba(0, 0, 0, .14);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  z-index: 1000002;
}
.menu-wrapper .hamburger:hover { background: rgba(10, 13, 11, .46); }
.menu-wrapper .hamburger:focus-visible {
  outline: 3px solid #d6aa14;
  outline-offset: 4px;
}
.menu-wrapper .hamburger div {
  width: 23px;
  height: 2px;
  margin: 3px 0;
  border-radius: 99px;
  background: #fff;
}
#menu-toggle:checked + .hamburger {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  border-color: rgba(214, 170, 20, .52);
  background: rgba(21, 24, 21, .88);
}
#menu-toggle:checked + .hamburger div:nth-child(1) { transform: rotate(45deg) translate(3px, 3px); }
#menu-toggle:checked + .hamburger div:nth-child(2) { transform: rotate(-45deg) translate(3px, -3px); }
.menu-wrapper .menu-popup {
  box-sizing: border-box;
  width: min(430px, 100vw);
  height: 100svh;
  min-height: 100vh;
  padding: max(92px, calc(env(safe-area-inset-top) + 82px)) 32px max(28px, calc(env(safe-area-inset-bottom) + 22px));
  justify-content: flex-start;
  overflow-x: hidden;
  overflow-y: auto;
  background:
    radial-gradient(circle at 4% 2%, rgba(214, 170, 20, .16), transparent 35%),
    linear-gradient(155deg, #151914, #060807);
  border-right: 1px solid rgba(255, 255, 255, .1);
  box-shadow: 28px 0 70px rgba(0, 0, 0, .32);
  transform: translate3d(-104%, 0, 0);
  transition: transform .58s cubic-bezier(.22, 1, .36, 1);
  z-index: 1000001;
}
#menu-toggle:checked ~ .menu-popup { transform: translate3d(0, 0, 0); }
.menu-panel-intro,
.menu-wrapper .menu-link,
.menu-contact-panel {
  opacity: 0;
  transition: opacity .48s ease;
}
#menu-toggle:checked ~ .menu-popup .menu-panel-intro,
#menu-toggle:checked ~ .menu-popup .menu-link,
#menu-toggle:checked ~ .menu-popup .menu-contact-panel { opacity: 1; }
#menu-toggle:checked ~ .menu-popup .menu-panel-intro { transition-delay: .14s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(1) { transition-delay: .18s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(2) { transition-delay: .22s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(3) { transition-delay: .26s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(4) { transition-delay: .30s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(5) { transition-delay: .34s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(6) { transition-delay: .38s; }
#menu-toggle:checked ~ .menu-popup .menu-link:nth-child(7) { transition-delay: .42s; }
#menu-toggle:checked ~ .menu-popup .menu-contact-panel { transition-delay: .46s; }
.menu-panel-intro { margin: 0 0 20px; }
.menu-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #d6aa14;
  font: 600 11px/1.2 "Inter", "Poppins", sans-serif;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.menu-panel-intro p {
  max-width: 310px;
  margin: 0;
  color: rgba(255, 255, 255, .67);
  font: 400 14px/1.55 "Inter", "Poppins", sans-serif;
}
.menu-wrapper .menu-content {
  height: auto;
  padding: 0;
  gap: 0;
}
.menu-wrapper .menu-link {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  min-height: 52px;
  padding: 12px 0;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  font: 400 clamp(19px, 2vw, 22px)/1.2 "Inter", "Poppins", sans-serif !important;
}
.menu-wrapper .menu-link:hover,
.menu-wrapper .menu-link:focus { color: #fff; transform: none; }
.menu-wrapper .menu-link:focus-visible {
  outline: 2px solid #d6aa14;
  outline-offset: 5px;
  border-radius: 2px;
}
.menu-index {
  color: #d6aa14;
  font: 600 10px/1 "Inter", sans-serif;
  letter-spacing: .08em;
}
.menu-link-label { transition: color .2s ease, translate .25s ease; }
.menu-link-arrow {
  width: 16px;
  height: 16px;
  opacity: .38;
  transition: opacity .2s ease, translate .25s ease;
}
.menu-link:hover .menu-link-label,
.menu-link:focus-visible .menu-link-label { color: #e2bd3c; translate: 4px 0; }
.menu-link:hover .menu-link-arrow,
.menu-link:focus-visible .menu-link-arrow { opacity: 1; translate: 3px 0; }
.menu-contact-panel {
  margin-top: auto;
  padding-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.menu-contact-panel p {
  order: 1;
  margin: 0;
  color: rgba(255, 255, 255, .7);
  font: 400 13px/1.5 "Inter", "Poppins", sans-serif;
}
.menu-wrapper .contact-button {
  order: 2;
  box-sizing: border-box;
  width: 100% !important;
  min-height: 52px;
  margin: 14px 0 0;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-radius: 999px;
  background: #d6aa14 !important;
  color: #121510 !important;
  box-shadow: 0 14px 32px rgba(214, 170, 20, .18);
  font: 600 14px/1 "Inter", "Poppins", sans-serif !important;
  letter-spacing: .01em;
  transition: transform .25s ease, background-color .25s ease, box-shadow .25s ease;
}
.menu-wrapper .contact-button:hover,
.menu-wrapper .contact-button:focus {
  background: #e3bb32 !important;
  color: #121510 !important;
  transform: translateY(-2px);
  box-shadow: 0 18px 38px rgba(214, 170, 20, .25);
}
.menu-wrapper .contact-button:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
}
.menu-wrapper .contact-button svg { width: 18px; height: 18px; }
.menu-whatsapp {
  order: 3;
  display: inline-flex;
  margin-top: 14px;
  color: rgba(255, 255, 255, .72) !important;
  font: 500 12px/1.4 "Inter", "Poppins", sans-serif;
  text-decoration: underline;
  text-decoration-color: rgba(214, 170, 20, .55);
  text-underline-offset: 4px;
}
.menu-whatsapp:hover,
.menu-whatsapp:focus { color: #fff !important; }
.menu-backdrop {
  all: unset;
  position: fixed;
  inset: 0;
  display: block;
  visibility: hidden;
  opacity: 0;
  cursor: default;
  background: rgba(4, 6, 5, .58);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  transition: opacity .38s ease, visibility 0s linear .38s;
  z-index: 1000000;
}
#menu-toggle:checked ~ .menu-backdrop {
  visibility: visible;
  opacity: 1;
  transition-delay: 0s;
}
@media (max-width: 767px) {
  .menu-wrapper .menu-popup {
    width: 100vw;
    padding-inline: 24px;
    background: radial-gradient(circle at 4% 2%, rgba(214, 170, 20, .13), transparent 35%), linear-gradient(155deg, #151914, #060807);
  }
  .menu-panel-intro { text-align: center; }
  .menu-panel-intro p { margin-inline: auto; }
  .menu-wrapper .menu-link { font-size: clamp(20px, 6vw, 25px) !important; }
  .menu-contact-panel { padding-top: 18px; text-align: center; }
  .menu-contact-panel p { display: none; }
  .menu-wrapper .contact-button { width: min(100%, 360px) !important; margin: 0 auto; }
  .menu-whatsapp { justify-content: center; }
}
@media (max-width: 767px) and (max-height: 760px) {
  .menu-wrapper .menu-popup { padding-top: max(76px, calc(env(safe-area-inset-top) + 68px)); padding-bottom: 16px; }
  .menu-panel-intro { margin-bottom: 8px; }
  .menu-panel-intro p,
  .menu-contact-panel p { display: none; }
  .menu-wrapper .menu-link { min-height: 44px; padding-block: 8px; font-size: 19px !important; }
  .menu-contact-panel { padding-top: 14px; }
  .menu-wrapper .contact-button { min-height: 48px; margin-top: 0; }
  .menu-whatsapp { margin-top: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .menu-wrapper .menu-popup,
  .menu-panel-intro,
  .menu-wrapper .menu-link,
  .menu-contact-panel,
  .menu-backdrop { transition-duration: .01ms !important; transition-delay: 0s !important; }
}
`;

const premiumMenuMarkup = `<nav id="azura-primary-menu" class="menu-popup" aria-label="Primary navigation" aria-hidden="true">
    <div class="menu-panel-intro">
      <span class="menu-eyebrow">Azura Living Bali</span>
      <p>Explore the villas, the vision and the opportunity.</p>
    </div>
    <div class="menu-content">
      <a class="scroll-link menu-link" href="#page-content" data-target="overview"><span class="menu-index">01</span><span class="menu-link-label">Overview</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="scroll-link menu-link" href="#page-content" data-target="design"><span class="menu-index">02</span><span class="menu-link-label">Design</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="scroll-link menu-link" href="#page-content" data-target="features"><span class="menu-index">03</span><span class="menu-link-label">Features</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="scroll-link menu-link" href="#page-content" data-target="calculator"><span class="menu-index">04</span><span class="menu-link-label">Calculator</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="scroll-link menu-link" href="#page-content" data-target="location"><span class="menu-index">05</span><span class="menu-link-label">Location</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="scroll-link menu-link" href="#page-content" data-target="vision"><span class="menu-index">06</span><span class="menu-link-label">Founder Story</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="scroll-link menu-link" href="#page-content" data-target="payment"><span class="menu-index">07</span><span class="menu-link-label">Payment</span><svg class="menu-link-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
    </div>
    <div class="menu-contact-panel">
      <p>Questions about availability, ownership or a private viewing?</p>
      <a href="https://api.leadconnectorhq.com/widget/bookings/azura-discovery-call" class="contact-button" target="_blank" rel="noopener noreferrer"><span>Contact Azura</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a href="https://wa.me/6281241960867?text=Hello%20Azura%20Living%20Bali%2C%20I%27d%20like%20to%20learn%20more." class="menu-whatsapp" target="_blank" rel="noopener noreferrer">Prefer WhatsApp? Message the team</a>
    </div>
  </nav>
  <button type="button" class="menu-backdrop" aria-label="Close navigation menu" data-menu-close></button>`;

function cleanMarkup(text) {
  let output = text;
  for (const [from, to] of replacements) output = output.replaceAll(from, to);
  let firstRocketPairsBlock = true;
  output = output.replace(
    /<script type="application\/javascript">const rocket_pairs = \[[\s\S]*?const rocket_excluded_pairs = \[\];<\/script>/g,
    (block) => {
      if (firstRocketPairsBlock) {
        firstRocketPairsBlock = false;
        return block;
      }
      return "";
    },
  );
  return output;
}

function cleanPage(text) {
  let output = cleanMarkup(text);
  output = output.replace(
    "<head>",
    `<head><link rel="preload" as="image" href="/assets/images/azura-hero-poster.jpg" fetchpriority="high">
<link rel="preload" as="image" href="/wp-content/uploads/2025/02/output-onlinepngtools-300x66.png" fetchpriority="high">
<style id="azura-critical-start">html{background:#0b0d0c}body{margin:0;background:#0b0d0c}body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-cf6720d,body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-cf6720d .elementor-background-video-container{background-color:#0b0d0c!important;background-image:linear-gradient(rgba(6,8,8,.28),rgba(6,8,8,.4)),url('/assets/images/azura-hero-poster.jpg')!important;background-position:center!important;background-repeat:no-repeat!important;background-size:cover!important}</style>`,
  );
  output = output.replaceAll(
    '"touchcancel","wheel","click"',
    '"touchcancel","click"',
  );
  output = output.replace(
    '<video class="elementor-background-video-hosted" role="presentation" autoplay muted playsinline loop></video>',
    '<video class="elementor-background-video-hosted" data-azura-hero-video role="presentation" src="/assets/video/azura-hero-sunset-optimized.mp4" poster="/assets/images/azura-hero-poster.jpg" preload="metadata" autoplay muted playsinline loop></video>',
  );
  output = output.replace(
    "elementor-element-b5272d9 e-con-full scroll-target-vision elementor-hidden-desktop elementor-hidden-tablet elementor-hidden-mobile e-flex",
    "elementor-element-b5272d9 e-con-full scroll-target-vision e-flex",
  );
  output = output.replace(
    '<h2 class="elementor-heading-title elementor-size-default">Vision</h2>',
    '<h2 class="elementor-heading-title elementor-size-default">The Story Behind Azura</h2>',
  );
  output = output.replace(
    /<img\b[^>]*class="attachment-full size-full wp-image-3070"[^>]*>\s*<noscript>[\s\S]*?<\/noscript>/i,
    '<img width="1920" height="1280" src="/assets/images/azura-birds-eye-vision.jpg" class="attachment-full size-full wp-image-3070" alt="Aerial rendering of Azura Living Bali villas surrounded by rice fields near the coast" loading="lazy" decoding="async" />',
  );
  output = output.replace(
    /<div class="elementor-element elementor-element-6203356[\s\S]*?(?=<div class="elementor-element elementor-element-edb8336)/i,
    `<div class="elementor-element elementor-element-6203356 elementor-widget__width-inherit elementor-widget-mobile__width-inherit elementor-widget elementor-widget-html" data-id="6203356" data-element_type="widget" data-e-type="widget" data-widget_type="html.default">
        <div class="elementor-widget-container">
          <div class="azura-founder-video-shell" data-azura-founder-video-shell>
            <video id="founder-story-video" class="azura-founder-video" data-azura-founder-video poster="/assets/images/ayham-founder-story-poster.jpg" preload="metadata" muted playsinline controls controlslist="nodownload" aria-label="Ayham Muhrez shares the story behind Azura Living Bali">
              <source src="/assets/video/azura-founder-story.mp4" type="video/mp4">
            </video>
            <span class="azura-founder-video-kicker" aria-hidden="true">Founder story · 1:09</span>
            <button class="azura-founder-sound" type="button" data-azura-founder-sound aria-pressed="false" aria-label="Play story with sound">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Zm13.5 3a4.5 4.5 0 0 0-2.25-3.9v7.8A4.5 4.5 0 0 0 17.5 12Zm-2.25-7.84v2.08a6.5 6.5 0 0 1 0 11.52v2.08a8.5 8.5 0 0 0 0-15.68Z"/></svg>
              <span>Play with sound</span>
            </button>
          </div>
        </div>
      </div>
      `,
  );
  output = output.replace(
    '<h2 class="elementor-heading-title elementor-size-default">Boutique Villas <br />  by Azura</h2>',
    '<h1 class="elementor-heading-title elementor-size-default">Boutique Villas <br />  by Azura</h1>',
  );
  output = output.replace(
    /(<div class="elementor-element elementor-element-dd0ada2[\s\S]*?<a href="\/">\s*)<img[^>]*wp-image-1221[^>]*\/?>\s*<noscript>[\s\S]*?<\/noscript>/i,
    '$1<img width="300" height="66" src="/wp-content/uploads/2025/02/output-onlinepngtools-300x66.png" class="attachment-full size-full wp-image-1221" alt="Azura Living Bali" loading="eager" fetchpriority="high" decoding="async" />',
  );
  output = output.replace(
    /<h1 class="elementor-heading-title elementor-size-default">(Vision|Payment Terms)<\/h1>/g,
    '<h2 class="elementor-heading-title elementor-size-default">$1</h2>',
  );
  output = output.replace(/<link\b[^>]*data-wpr-hosted-gf-parameters=["'][^"']*["'][^>]*>\s*/gi, "");
  output = output.replace(
    /<meta name="robots" content="noindex, nofollow"\s*\/?\s*>/i,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
  );
  if (!/<meta name="description"/i.test(output)) {
    output = output.replace(
      /<title>([\s\S]*?)<\/title>/i,
      '<title>$1</title>\n<meta name="description" content="Discover Azura Living Bali’s 4-bedroom wellness villas in Tabanan, with private amenities, investment returns, flexible payment terms and early-bird availability.">',
    );
  }
  output = output.replace(
    /(<meta (?:property="og:image(?::secure_url)?"|name="twitter:image") content=")\/wp-content\//gi,
    '$1https://azuralivingbali.com/wp-content/',
  );
  output = output.replace(
    /(<script type="application\/ld\+json"[\s\S]*?<\/script>)/gi,
    (block) => block.replaceAll('"/wp-content/', '"https://azuralivingbali.com/wp-content/'),
  );
  output = output.replace(
    /<script>var rocket_beacon_data = [\s\S]*?<\/script><script data-name="wpr-wpr-beacon"[\s\S]*?<\/script>/gi,
    "",
  );
  output = output.replace(/<img(?![^>]*\balt=)([^>]*)>/gi, '<img alt=""$1>');
  output = output.replace(
    /<iframe(?![^>]*\btitle=)([^>]*)>/gi,
    '<iframe title="Embedded content"$1>',
  );
  output = output.replace(
    /src="about:blank"([^>]*?)\s+data-rocket-lazyload="fitvidscompatible"\s+data-lazy-src="\/recovery\/maps\/"/gi,
    'src="/recovery/maps/"$1',
  );
  output = output.replace(
    /<label class="hamburger" for="menu-toggle"(?: aria-label="Open navigation menu")?>/i,
    '<label class="hamburger" for="menu-toggle" role="button" tabindex="0" aria-label="Open navigation menu" aria-controls="azura-primary-menu" aria-expanded="false">',
  );
  output = output.replace(
    /<nav class="menu-popup">[\s\S]*?<\/nav>/i,
    premiumMenuMarkup,
  );
  output = output.replace(
    '<div class="menu-wrapper">',
    `<style id="azura-premium-menu-css">${premiumMenuStyles}</style>\n<div class="menu-wrapper">`,
  );
  output = output.replace(
    /<a class="scroll-link" data-target="([^"]+)">/gi,
    '<a class="scroll-link" href="#page-content" data-target="$1">',
  );
  output = output.replace(
    /<script\b[^>]*data-rocket-src="[^"]*lenis[^"]*"[^>]*><\/script>\s*<script type="rocketlazyloadscript">[\s\S]*?new Lenis\([\s\S]*?<\/script>\s*<style>[\s\S]*?scroll-behavior:\s*auto[\s\S]*?<\/style>/i,
    "",
  );
  output = output.replace(
    /(<div data-elementor-type="wp-page" data-elementor-id="4371")/i,
    '<span id="page-content"></span>$1',
  );
  output = output.replace(
    /<(input|select|textarea)(?![^>]*\baria-label=)([^>]*)>/gi,
    (full, tag, attributes) => {
      const label =
        attributes.match(/placeholder="([^"]+)"/i)?.[1] ||
        attributes.match(/name="([^"]+)"/i)?.[1] ||
        attributes.match(/id="([^"]+)"/i)?.[1] ||
        tag;
      return `<${tag} aria-label="${label.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"${attributes}>`;
    },
  );
  output = output.replace(
    "</head>",
    `<style id="azura-static-recovery-css">
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-cf6720d {
  background-color: #0b0d0c !important;
  background-image: linear-gradient(rgba(6, 8, 8, .28), rgba(6, 8, 8, .4)), url('/assets/images/azura-hero-poster.jpg') !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-cf6720d .elementor-background-video-container {
  overflow: hidden !important;
  background-color: #0b0d0c !important;
  background-image: linear-gradient(rgba(6, 8, 8, .28), rgba(6, 8, 8, .4)), url('/assets/images/azura-hero-poster.jpg') !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
.elementor-element-cf6720d .elementor-background-video-hosted {
  width: 100% !important;
  height: 100% !important;
  inset: 0 !important;
  inset-block-start: 0 !important;
  inset-inline-start: 0 !important;
  opacity: 0;
  transform: none !important;
  object-fit: cover !important;
  backface-visibility: hidden;
  transition: opacity .14s linear;
  will-change: opacity;
}
.elementor-element-cf6720d .elementor-background-video-hosted.azura-video-ready {
  opacity: 1;
  will-change: auto;
}
/* Use direct local imagery so these sections never fall back to WordPress grey. */
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-853059a:not(.elementor-motion-effects-element-type-background),
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-853059a > .elementor-motion-effects-container > .elementor-motion-effects-layer,
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-d86c731:not(.elementor-motion-effects-element-type-background),
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-d86c731 > .elementor-motion-effects-container > .elementor-motion-effects-layer {
  background-color: #233126 !important;
  background-image: linear-gradient(180deg, rgba(8, 14, 10, .04) 32%, rgba(8, 14, 10, .72) 100%), url('/assets/images/tabanan-jatiluwih-rice-terraces.jpg') !important;
  background-position: center 62% !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  background-attachment: scroll !important;
}
.elementor-4223 .elementor-element.elementor-element-8f851bb {
  background-color: #080909 !important;
  background-image: linear-gradient(180deg, rgba(5, 7, 7, .56), rgba(5, 7, 7, .78)), url('/assets/images/early-bird-bali-villa-sunset.jpg') !important;
  background-position: center 58% !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  background-attachment: scroll !important;
}
.elementor-4223 .elementor-element.elementor-element-8f851bb::before {
  display: none !important;
}
.elementor-4223 .elementor-element.elementor-element-8f851bb > .e-con-inner {
  position: relative;
  z-index: 1;
}
.elementor-4223 .elementor-element.elementor-element-58e207b {
  display: none !important;
}
/* Restore the original founder vision section with authentic Azura media. */
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-b5272d9 {
  display: flex !important;
  padding: clamp(56px, 7vw, 104px) clamp(20px, 5vw, 80px) !important;
  background: #f3f3e9 !important;
}
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-b5272d9 > .elementor-element-5e204d1 {
  width: min(100%, 1240px);
  margin-inline: auto;
  padding-bottom: 0 !important;
}
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-1379d06 {
  min-height: clamp(360px, 44vw, 600px);
  border-radius: 24px;
  overflow: hidden;
  background-color: #273329 !important;
  background-image: linear-gradient(180deg, rgba(12, 18, 13, .02), rgba(12, 18, 13, .22)), url('/assets/images/azura-birds-eye-vision.jpg') !important;
  background-position: center 54% !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-1379d06::before {
  display: none !important;
}
body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-6c57905 {
  gap: clamp(32px, 5vw, 72px);
  align-items: center;
  padding-top: clamp(40px, 5vw, 72px);
}
.azura-founder-video-shell {
  position: relative;
  width: min(100%, 410px);
  margin-inline: auto;
  overflow: hidden;
  border-radius: 24px;
  background: #0a0c0b;
  box-shadow: 0 24px 64px rgba(25, 30, 26, .2);
  isolation: isolate;
}
.azura-founder-video {
  display: block;
  width: 100%;
  aspect-ratio: 480 / 852;
  object-fit: cover;
  background: #0a0c0b;
}
.azura-founder-video-kicker,
.azura-founder-sound {
  position: absolute;
  z-index: 2;
  top: 14px;
  border: 1px solid rgba(255, 255, 255, .28);
  background: rgba(12, 15, 13, .72);
  color: #fff;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  font-family: "Inter", sans-serif;
  font-size: 12px;
  line-height: 1;
}
.azura-founder-video-kicker {
  left: 14px;
  padding: 10px 12px;
  border-radius: 999px;
  pointer-events: none;
}
.azura-founder-sound {
  right: 14px;
  min-height: 44px;
  padding: 9px 13px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: background-color .2s ease, transform .2s ease;
}
.azura-founder-sound:hover { background: rgba(12, 15, 13, .9); transform: translateY(-1px); }
.azura-founder-sound:focus-visible { outline: 3px solid #d1a30a; outline-offset: 3px; }
.azura-founder-sound svg { width: 17px; height: 17px; fill: currentColor; flex: 0 0 auto; }
html {
  scroll-behavior: smooth;
  scroll-padding-top: 72px;
}
html.azura-lenis-active {
  scroll-behavior: auto !important;
}
/* Premium motion is applied only after JavaScript is ready, so content never flashes away. */
.azura-motion-ready .azura-reveal {
  opacity: 0;
  translate: 0 26px;
  scale: .992;
  transition:
    opacity .72s cubic-bezier(.22, 1, .36, 1),
    translate .78s cubic-bezier(.22, 1, .36, 1),
    scale .78s cubic-bezier(.22, 1, .36, 1);
  transition-delay: var(--azura-reveal-delay, 0ms);
  will-change: opacity, translate, scale;
}
.azura-motion-ready .azura-reveal.azura-reveal-left { translate: -24px 0; }
.azura-motion-ready .azura-reveal.azura-reveal-right { translate: 24px 0; }
.azura-motion-ready .azura-reveal.is-visible {
  opacity: 1;
  translate: 0 0;
  scale: 1;
  will-change: auto;
}
body.home.page-id-4371 a.elementor-button,
body.home.page-id-4371 .elementor-button,
body.home.page-id-4371 button:not(.menu-backdrop):not(.hamburger) {
  transition: transform .25s ease, box-shadow .25s ease, background-color .25s ease, color .25s ease;
}
@media (hover: hover) and (pointer: fine) {
  body.home.page-id-4371 a.elementor-button:hover,
  body.home.page-id-4371 .elementor-button:hover { transform: translateY(-2px); }
  body.home.page-id-4371 .elementor-widget-image img { transition: scale .7s cubic-bezier(.22, 1, .36, 1); }
  body.home.page-id-4371 .elementor-widget-image:hover img { scale: 1.012; }
}
body.home.page-id-4371 a.elementor-button:active,
body.home.page-id-4371 .elementor-button:active { transform: scale(.985); }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .elementor-element-cf6720d .elementor-background-video-hosted { display: none; transition: none; }
  .azura-founder-sound { transition: none; }
  .azura-motion-ready .azura-reveal,
  .azura-motion-ready .azura-reveal.azura-reveal-left,
  .azura-motion-ready .azura-reveal.azura-reveal-right {
    opacity: 1;
    translate: 0 0;
    scale: 1;
    transition: none;
  }
}
@media (max-width: 767px) {
  .elementor-4223 .elementor-element.elementor-element-8f851bb {
    --min-height: 56svh;
    min-height: 56svh;
    background-position: 58% center !important;
  }
  body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-b5272d9 {
    padding: 48px 20px 56px !important;
  }
  body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-f99e5f6 {
    text-align: center !important;
  }
  body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-8fa3aa5 img {
    width: 100% !important;
    height: clamp(220px, 65vw, 300px) !important;
    border-radius: 18px;
    object-fit: cover;
    object-position: center;
  }
  body.home.page-id-4371 .elementor-4371 .elementor-element.elementor-element-6c57905 {
    gap: 32px;
    padding-top: 36px;
  }
  .azura-founder-video-shell { width: min(100%, 390px); border-radius: 20px; }
  .azura-founder-video-kicker { display: none; }
  .azura-founder-sound { top: 72px; right: 12px; }
  .azura-motion-ready .azura-reveal {
    translate: 0 20px;
    transition-duration: .62s, .68s, .68s;
  }
  .azura-motion-ready .azura-reveal.azura-reveal-left,
  .azura-motion-ready .azura-reveal.azura-reveal-right { translate: 0 20px; }
}
</style>
<script defer src="/wp-content/cache/min/1/gh/studio-freight/lenis@0.2.28/bundled/lenis.js"></script>
<script id="azura-runtime-polish">
document.addEventListener('DOMContentLoaded', function () {
  var video = document.querySelector('[data-azura-hero-video]');
  if (video) {
    var reducedHeroMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedHeroMotion) {
      video.pause();
      video.removeAttribute('autoplay');
    } else {
      var frameWatchStarted = false;
      var revealVideo = function () {
        if (video.classList.contains('azura-video-ready')) return;
        requestAnimationFrame(function () { video.classList.add('azura-video-ready'); });
      };
      var waitForStableFrame = function () {
        if (frameWatchStarted) return;
        frameWatchStarted = true;
        if (video.requestVideoFrameCallback) {
          var decodedFrames = 0;
          var onVideoFrame = function () {
            decodedFrames += 1;
            if (decodedFrames >= 2) revealVideo();
            else video.requestVideoFrameCallback(onVideoFrame);
          };
          video.requestVideoFrameCallback(onVideoFrame);
        } else {
          requestAnimationFrame(function () { requestAnimationFrame(revealVideo); });
        }
      };
      video.addEventListener('canplay', waitForStableFrame, { once: true });
      if (video.readyState >= 3) waitForStableFrame();
      video.muted = true;
      var ensurePlayback = function () {
        if (document.visibilityState !== 'visible') return;
        var playback = video.play();
        if (playback && playback.catch) playback.catch(function () {});
      };
      ensurePlayback();
      document.addEventListener('visibilitychange', ensurePlayback);
    }
  }

  var founderVideo = document.querySelector('[data-azura-founder-video]');
  var founderSound = document.querySelector('[data-azura-founder-sound]');
  if (founderVideo) {
    var reducedFounderMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    founderVideo.muted = true;
    founderVideo.defaultMuted = true;
    founderVideo.playsInline = true;

    var setFounderSoundLabel = function () {
      if (!founderSound) return;
      var label = founderVideo.muted ? (reducedFounderMotion ? 'Play with sound' : 'Turn sound on') : 'Turn sound off';
      founderSound.querySelector('span').textContent = label;
      founderSound.setAttribute('aria-label', label);
      founderSound.setAttribute('aria-pressed', founderVideo.muted ? 'false' : 'true');
    };

    if (!reducedFounderMotion) {
      var updateFounderPlayback = function () {
        var rect = founderVideo.getBoundingClientRect();
        var nearViewport = rect.top < window.innerHeight + 220 && rect.bottom > -220;
        if (nearViewport && founderVideo.paused && !founderVideo.ended) {
          var playback = founderVideo.play();
          if (playback && playback.catch) playback.catch(function () {});
        }
      };
      if ('IntersectionObserver' in window) {
        var founderObserver = new IntersectionObserver(updateFounderPlayback, { rootMargin: '220px 0px', threshold: 0.01 });
        founderObserver.observe(founderVideo);
      }
      var founderFramePending = false;
      var queueFounderPlaybackCheck = function () {
        if (founderFramePending) return;
        founderFramePending = true;
        requestAnimationFrame(function () {
          founderFramePending = false;
          updateFounderPlayback();
        });
      };
      window.addEventListener('scroll', queueFounderPlaybackCheck, { passive: true });
      window.addEventListener('resize', queueFounderPlaybackCheck, { passive: true });
      requestAnimationFrame(updateFounderPlayback);
    }

    if (founderSound) {
      founderSound.addEventListener('click', function (event) {
        event.stopPropagation();
        if (founderVideo.ended) founderVideo.currentTime = 0;
        if (founderVideo.muted) {
          founderVideo.removeAttribute('muted');
          founderVideo.defaultMuted = false;
          founderVideo.muted = false;
          founderVideo.volume = 1;
        } else {
          founderVideo.muted = true;
        }
        if (!founderVideo.paused && founderVideo.muted) {
          setFounderSoundLabel();
          return;
        }
        var playback = founderVideo.play();
        if (playback && playback.catch) playback.catch(function () {});
        setFounderSoundLabel();
      }, { isRocket: true });
      founderVideo.addEventListener('volumechange', setFounderSoundLabel);
      setFounderSoundLabel();
    }
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var menuToggle = document.getElementById('menu-toggle');
  var menuButton = document.querySelector('.menu-wrapper .hamburger');
  var menuPopup = document.getElementById('azura-primary-menu');
  var menuBackdrop = document.querySelector('[data-menu-close]');

  if (menuToggle && menuButton && menuPopup) {
    var firstMenuLink = menuPopup.querySelector('.menu-link');
    var syncMenuState = function (moveFocus) {
      var isOpen = menuToggle.checked;
      menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
      menuPopup.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      document.documentElement.classList.toggle('azura-menu-open', isOpen);
      if (isOpen && moveFocus && firstMenuLink) {
        window.setTimeout(function () { firstMenuLink.focus({ preventScroll: true }); }, 180);
      }
    };
    var closeMenu = function (returnFocus) {
      menuToggle.checked = false;
      syncMenuState(false);
      if (returnFocus) menuButton.focus({ preventScroll: true });
    };

    menuButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      menuToggle.checked = !menuToggle.checked;
      syncMenuState(menuToggle.checked);
    }, { isRocket: true });
    menuButton.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      menuToggle.checked = !menuToggle.checked;
      syncMenuState(menuToggle.checked);
    }, { isRocket: true });
    menuToggle.addEventListener('change', function () { syncMenuState(menuToggle.checked); }, { isRocket: true });
    if (menuBackdrop) {
      menuBackdrop.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
      }, { isRocket: true });
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuToggle.checked) closeMenu(true);
    }, { isRocket: true });

    menuPopup.querySelectorAll('.scroll-link').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        var targetKey = link.getAttribute('data-target');
        var targets = document.querySelectorAll('.scroll-target-' + targetKey);
        var target = null;
        targets.forEach(function (candidate) {
          var style = window.getComputedStyle(candidate);
          if (style.display !== 'none' && candidate.getClientRects().length) target = candidate;
        });
        closeMenu(false);
        if (!target) return;
        window.requestAnimationFrame(function () {
          if (window.azuraLenis && typeof window.azuraLenis.scrollTo === 'function') {
            window.azuraLenis.scrollTo(target, { offset: -72, duration: 1.05 });
          } else {
            var top = target.getBoundingClientRect().top + window.scrollY - 72;
            window.scrollTo({ top: top, behavior: reducedMotion ? 'auto' : 'smooth' });
          }
        });
      }, { isRocket: true });
    });
    menuPopup.querySelectorAll('.contact-button, .menu-whatsapp').forEach(function (link) {
      link.addEventListener('click', function (event) { event.stopPropagation(); }, { isRocket: true });
    });
    syncMenuState(false);
  }

  if (!reducedMotion && 'IntersectionObserver' in window) {
    var revealSelector = [
      '.elementor-4371 .elementor-widget-heading',
      '.elementor-4371 .elementor-widget-text-editor',
      '.elementor-4371 .elementor-widget-image',
      '.elementor-4371 .elementor-widget-icon-box',
      '.elementor-4371 .elementor-widget-icon-list',
      '.elementor-4371 .elementor-widget-counter',
      '.elementor-4371 .elementor-widget-button',
      '.elementor-4223 .elementor-widget-heading',
      '.elementor-4223 .elementor-widget-text-editor',
      '.elementor-4223 .elementor-widget-button',
      '.azura-founder-video-shell'
    ].join(',');
    var revealNodes = Array.from(document.querySelectorAll(revealSelector)).filter(function (node) {
      return !node.closest('header') && !node.closest('.elementor-element-cf6720d') && !node.closest('.menu-popup') && node.getClientRects().length;
    });
    revealNodes.forEach(function (node, index) {
      node.classList.add('azura-reveal');
      if (node.matches('.elementor-widget-image, .azura-founder-video-shell')) {
        node.classList.add(index % 2 ? 'azura-reveal-right' : 'azura-reveal-left');
      }
      node.style.setProperty('--azura-reveal-delay', String((index % 4) * 55) + 'ms');
    });
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -7% 0px' });
    revealNodes.forEach(function (node) { revealObserver.observe(node); });
    document.documentElement.classList.add('azura-motion-ready');
    window.requestAnimationFrame(function () {
      revealNodes.forEach(function (node) {
        if (node.getBoundingClientRect().top < window.innerHeight * .94) node.classList.add('is-visible');
      });
    });
  }

  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (!reducedMotion && finePointer && window.Lenis) {
    var lenis = new Lenis({
      duration: 0.95,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false,
      mouseMultiplier: 0.9,
      touchMultiplier: 1.5,
      infinite: false
    });
    document.documentElement.classList.add('azura-lenis-active');
    window.azuraLenis = lenis;
    var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}, { once: true, isRocket: true });
</script>\n</head>`,
  );
  return output;
}

function rewriteCssUrls(css, stylesheetUrl) {
  return css
    .replace(/@charset\s+["'][^"']+["'];?/gi, "")
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (full, quote, value) => {
      const trimmed = value.trim();
      if (/^(?:data:|https?:|\/\/|\/|#)/i.test(trimmed)) return full;
      try {
        const resolved = new URL(trimmed, new URL(stylesheetUrl, origin));
        return `url(${quote}${resolved.pathname}${resolved.search}${resolved.hash}${quote})`;
      } catch {
        return full;
      }
    });
}

async function bundleHeadStyles(pageFile, bundleName) {
  const html = await fs.readFile(pageFile, "utf8");
  const headEnd = html.indexOf("</head>");
  if (headEnd === -1) return;
  const head = html.slice(0, headEnd);
  const linkPattern = /<link\b(?=[^>]*\brel=(?:"stylesheet"|'stylesheet'))[^>]*>/gi;
  const candidates = [];

  for (const match of head.matchAll(linkPattern)) {
    const href = match[0].match(/\bhref=(?:"([^"]+)"|'([^']+)')/i)?.slice(1).find(Boolean);
    if (!href?.startsWith("/")) continue;
    const assetUrl = new URL(href.replaceAll("&amp;", "&"), origin);
    const assetFile = localPathFor(assetUrl);
    if (!assetFile) continue;
    try {
      const css = await fs.readFile(assetFile, "utf8");
      const media = match[0].match(/\bmedia=(?:"([^"]+)"|'([^']+)')/i)?.slice(1).find(Boolean);
      const rewritten = rewriteCssUrls(css, assetUrl.href);
      candidates.push({
        index: match.index,
        length: match[0].length,
        css: media && media !== "all" ? `@media ${media}{${rewritten}}` : rewritten,
        href: assetUrl.pathname,
      });
    } catch {
      // Keep any stylesheet that was not successfully mirrored.
    }
  }

  if (!candidates.length) return;
  const bundlePath = path.join(publicRoot, "assets", bundleName);
  const bundle = candidates.map((item) => `/* ${item.href} */\n${item.css}`).join("\n");
  await fs.writeFile(bundlePath, bundle);

  let rebuilt = "";
  let cursor = 0;
  candidates.forEach((item, index) => {
    rebuilt += head.slice(cursor, item.index);
    if (index === 0) rebuilt += `<link rel="stylesheet" href="/assets/${bundleName}">`;
    cursor = item.index + item.length;
  });
  rebuilt += head.slice(cursor);
  await fs.writeFile(pageFile, `${rebuilt}${html.slice(headEnd)}`);
}

async function inlineBodyStyles(pageFile) {
  const html = await fs.readFile(pageFile, "utf8");
  const headEnd = html.indexOf("</head>");
  if (headEnd === -1) return;
  const before = html.slice(0, headEnd + 7);
  const body = html.slice(headEnd + 7);
  const linkPattern = /<link\b(?=[^>]*\brel=(?:"stylesheet"|'stylesheet'))[^>]*>/gi;
  const candidates = [];

  for (const match of body.matchAll(linkPattern)) {
    const href = match[0].match(/\bhref=(?:"([^"]+)"|'([^']+)')/i)?.slice(1).find(Boolean);
    if (!href?.startsWith("/")) continue;
    const assetUrl = new URL(href.replaceAll("&amp;", "&"), origin);
    const assetFile = localPathFor(assetUrl);
    if (!assetFile) continue;
    try {
      const css = await fs.readFile(assetFile, "utf8");
      const media = match[0].match(/\bmedia=(?:"([^"]+)"|'([^']+)')/i)?.slice(1).find(Boolean);
      const rewritten = rewriteCssUrls(css, assetUrl.href);
      candidates.push({
        index: match.index,
        length: match[0].length,
        css: media && media !== "all" ? `@media ${media}{${rewritten}}` : rewritten,
        href: assetUrl.pathname,
      });
    } catch {
      // Leave any stylesheet that was not successfully mirrored in place.
    }
  }

  if (!candidates.length) return;
  let rebuilt = "";
  let cursor = 0;
  for (const item of candidates) {
    rebuilt += body.slice(cursor, item.index);
    rebuilt += `<style data-source="${item.href}">${item.css}</style>`;
    cursor = item.index + item.length;
  }
  rebuilt += body.slice(cursor);
  await fs.writeFile(pageFile, `${before}${rebuilt}`);
}

function localPathFor(url, isPage = false) {
  let pathname = decodeURIComponent(url.pathname);
  if (isPage || pathname.endsWith("/")) pathname += "index.html";
  pathname = pathname.replace(/^\/+/, "");
  if (!pathname || pathname.includes("..")) return null;
  return path.join(publicRoot, pathname);
}

function shouldMirror(url) {
  if (url.origin !== origin.origin) return false;
  if (url.pathname.startsWith("/wp-admin/")) return false;
  if (url.pathname.startsWith("/wp-json/")) return false;
  if (url.pathname === "/xmlrpc.php") return false;
  if (url.pathname.endsWith("/feed/")) return false;
  return (
    url.pathname.startsWith("/wp-content/") ||
    url.pathname.startsWith("/wp-includes/")
  );
}

function enqueue(input, base = origin) {
  let url;
  try {
    url = new URL(input.replaceAll("&#038;", "&").replaceAll("&amp;", "&"), base);
  } catch {
    return;
  }
  if (!shouldMirror(url)) return;
  url.hash = "";
  const key = `${url.origin}${url.pathname}`;
  if (queued.has(key)) return;
  queued.add(key);
  queue.push(url);
}

function discover(text, base) {
  const decoded = text
    .replaceAll("\\/", "/")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#038;", "&")
    .replaceAll("&amp;", "&");
  for (const match of decoded.matchAll(/https?:\/\/azuralivingbali\.com\/[^\s"'<>()[\]{}\\]+/gi)) {
    enqueue(match[0], base);
  }
  for (const match of decoded.matchAll(/(?:src|href|data-lazy-src|data-src)=["'](\/wp-(?:content|includes)\/[^"']+)["']/gi)) {
    enqueue(match[1], base);
  }
  for (const match of decoded.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    enqueue(match[1], base);
  }
}

async function fetchResource(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": userAgent, accept: "*/*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

async function mirrorPage(pagePath) {
  const url = new URL(pagePath, origin);
  const response = await fetchResource(url);
  const raw = await response.text();
  discover(raw, url);
  const html = cleanPage(raw);
  const target = localPathFor(url, true);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html);
  downloadedBytes += Buffer.byteLength(html);
}

async function mirrorAsset(url) {
  const target = localPathFor(url);
  if (!target) return;
  try {
    const response = await fetchResource(url);
    const contentType = response.headers.get("content-type") || "";
    let body = Buffer.from(await response.arrayBuffer());
    if (/text\/(css|javascript|html)|application\/(javascript|json)/i.test(contentType)) {
      const sourceText = body.toString("utf8");
      discover(sourceText, url);
      const text = cleanMarkup(sourceText);
      body = Buffer.from(text);
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    downloadedBytes += body.length;
  } catch (error) {
    failures.push({ url: url.href, error: error.message });
  }
}

await fs.rm(publicRoot, { recursive: true, force: true });
await fs.mkdir(publicRoot, { recursive: true });
for (const page of pages) await mirrorPage(page);
for (const asset of runtimeAssets) enqueue(asset);

let cursor = 0;
const workerCount = 8;
async function worker() {
  while (cursor < queue.length) {
    const current = queue[cursor++];
    await mirrorAsset(current);
  }
}
await Promise.all(Array.from({ length: workerCount }, () => worker()));
await fs.cp(path.join(projectRoot, "recovery"), path.join(publicRoot, "recovery"), {
  recursive: true,
});
await fs.cp(path.join(projectRoot, "static-assets"), path.join(publicRoot, "assets"), {
  recursive: true,
});
await fs.copyFile(
  path.join(projectRoot, "static-assets", "favicon.png"),
  path.join(publicRoot, "wp-content", "uploads", "2025", "02", "Azura_White_Logo__No_Background_.png"),
);
await fs.cp(path.join(projectRoot, "static-root"), publicRoot, { recursive: true });
await bundleHeadStyles(path.join(publicRoot, "index.html"), "site-home.css");
await bundleHeadStyles(path.join(publicRoot, "early-bird", "index.html"), "site-early-bird.css");
await inlineBodyStyles(path.join(publicRoot, "index.html"));
await inlineBodyStyles(path.join(publicRoot, "early-bird", "index.html"));

const report = {
  source: origin.href,
  generatedAt: new Date().toISOString(),
  pages,
  mirroredAssets: queued.size - failures.length,
  downloadedBytes,
  failures,
};
await fs.writeFile(path.join(projectRoot, "mirror-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      pages: pages.length,
      assets: report.mirroredAssets,
      megabytes: Number((downloadedBytes / 1024 / 1024).toFixed(2)),
      failures: failures.length,
    },
    null,
    2,
  ),
);

if (failures.length > 20) process.exitCode = 1;
