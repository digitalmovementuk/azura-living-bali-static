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
  output = output.replaceAll(
    '"touchcancel","wheel","click"',
    '"touchcancel","click"',
  );
  output = output.replace(
    '<video class="elementor-background-video-hosted" role="presentation" autoplay muted playsinline loop></video>',
    '<video class="elementor-background-video-hosted" data-azura-hero-video role="presentation" src="/wp-content/uploads/2025/08/Azura-Hero-Sunset.mp4" poster="/wp-content/uploads/2025/08/Bildschirmfoto-2025-08-18-um-19.04.37-scaled.jpg" preload="metadata" autoplay muted playsinline loop></video>',
  );
  output = output.replace(
    '<h2 class="elementor-heading-title elementor-size-default">Boutique Villas <br />  by Azura</h2>',
    '<h1 class="elementor-heading-title elementor-size-default">Boutique Villas <br />  by Azura</h1>',
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
    '<label class="hamburger" for="menu-toggle">',
    '<label class="hamburger" for="menu-toggle" aria-label="Open navigation menu">',
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
    `<link rel="preload" as="image" href="/wp-content/uploads/2025/08/Bildschirmfoto-2025-08-18-um-19.04.37-scaled.jpg" fetchpriority="high">
<style id="azura-static-recovery-css">
.elementor-element-cf6720d {
  background-color: #0b0d0c !important;
  background-image: linear-gradient(rgba(6, 8, 8, .28), rgba(6, 8, 8, .4)), url('/wp-content/uploads/2025/08/Bildschirmfoto-2025-08-18-um-19.04.37-scaled.jpg') !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
.elementor-element-cf6720d .elementor-background-video-container {
  overflow: hidden !important;
  background-color: #0b0d0c !important;
  background-image: linear-gradient(rgba(6, 8, 8, .28), rgba(6, 8, 8, .4)), url('/wp-content/uploads/2025/08/Bildschirmfoto-2025-08-18-um-19.04.37-scaled.jpg') !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
}
.elementor-element-cf6720d .elementor-background-video-hosted {
  width: 100% !important;
  height: 100% !important;
  inset: 0 !important;
  opacity: 0;
  transform: translateZ(0) scale(1.008) !important;
  object-fit: cover !important;
  backface-visibility: hidden;
  transition: opacity .45s ease;
  will-change: opacity;
}
.elementor-element-cf6720d .elementor-background-video-hosted.azura-video-ready {
  opacity: 1;
}
html {
  scroll-behavior: smooth;
  scroll-padding-top: 72px;
}
html.azura-lenis-active {
  scroll-behavior: auto !important;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .elementor-element-cf6720d .elementor-background-video-hosted { transition: none; }
}
</style>
<script defer src="/wp-content/cache/min/1/gh/studio-freight/lenis@0.2.28/bundled/lenis.js"></script>
<script id="azura-runtime-polish">
document.addEventListener('DOMContentLoaded', function () {
  var video = document.querySelector('[data-azura-hero-video]');
  if (video) {
    var revealVideo = function () { video.classList.add('azura-video-ready'); };
    if (!video.paused && video.readyState >= 2) revealVideo();
    video.addEventListener('playing', revealVideo, { once: true });
    video.muted = true;
    var ensurePlayback = function () {
      if (document.visibilityState !== 'visible') return;
      var playback = video.play();
      if (playback && playback.catch) playback.catch(function () {});
    };
    ensurePlayback();
    document.addEventListener('visibilitychange', ensurePlayback);
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
});
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
