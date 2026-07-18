import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:4179';
const viewports = [
  { name: '1728x1117', width: 1728, height: 1117 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x740', width: 360, height: 740 },
];

const results = [];

for (const viewport of viewports) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1300);

  const metrics = await page.evaluate(() => {
    const header = document.querySelector('.site-header');
    const hero = document.querySelector('.hero');
    const copy = document.querySelector('.hero__copy');
    const proof = document.querySelector('.hero__proof');
    const h1 = document.querySelector('.hero h1');
    const video = document.querySelector('[data-testid="hero-video"]');
    const rect = (node) => node?.getBoundingClientRect();
    const headerRect = rect(header);
    const heroRect = rect(hero);
    const copyRect = rect(copy);
    const proofRect = rect(proof);

    return {
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerBottom: headerRect?.bottom ?? 0,
      heroBottom: heroRect?.bottom ?? 0,
      contentTop: copyRect?.top ?? 0,
      contentBottom: proofRect?.bottom ?? 0,
      gapBelowContent: (heroRect?.bottom ?? 0) - (proofRect?.bottom ?? 0),
      mobileTextAlign: h1 ? getComputedStyle(h1).textAlign : null,
      videoMuted: video instanceof HTMLVideoElement ? video.muted : false,
      videoPaused: video instanceof HTMLVideoElement ? video.paused : true,
    };
  });

  await page.screenshot({ path: `tests/screenshots/hero-${viewport.name}.png`, fullPage: false });

  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    for (let position = 0; position < height; position += Math.max(window.innerHeight * 0.8, 500)) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
    window.scrollTo(0, 0);
    document.querySelectorAll('video').forEach((video) => video.pause());
  });
  await page.waitForTimeout(500);

  if (viewport.name === '1440x900' || viewport.name === '390x844') {
    const sectionShots = [
      ['residences', '#residences'],
      ['wellness', '#wellness'],
      ['investment', '#investment'],
      ['location', '#location'],
      ['ownership', '#ownership'],
      ['founder', '.founder'],
      ['faq', '.faq'],
      ['contact', '#contact'],
    ];
    for (const [label, selector] of sectionShots) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `tests/screenshots/${label}-${viewport.name}.jpg`,
        type: 'jpeg',
        quality: 68,
        fullPage: false,
      });
    }
  }

  await page.locator('.founder').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  const founderMedia = await page.evaluate(() => {
    const video = document.querySelector('[data-testid="founder-video"]');
    return video instanceof HTMLVideoElement
      ? {
          muted: video.muted,
          paused: video.paused,
          playsInline: video.playsInline,
          readyState: video.readyState,
          currentTime: video.currentTime,
          source: video.currentSrc,
        }
      : null;
  });

  await page.locator('.location-hero').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const locationMedia = await page.evaluate(() => {
    const video = document.querySelector('[data-testid="location-video"]');
    return video instanceof HTMLVideoElement
      ? { muted: video.muted, paused: video.paused, readyState: video.readyState, source: video.currentSrc }
      : null;
  });

  const brokenImages = await page.locator('img').evaluateAll((images) =>
    images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.getAttribute('src')),
  );

  await page.locator('.menu-toggle').click();
  await page.waitForTimeout(350);
  const menuVisible = await page.locator('#site-menu').getAttribute('aria-hidden');
  if (viewport.name === '390x844') {
    await page.screenshot({ path: 'tests/screenshots/menu-390x844.png', fullPage: false });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);

  const accessibility = await new AxeBuilder({ page }).analyze();

  results.push({
    viewport: viewport.name,
    metrics,
    founderMedia,
    locationMedia,
    menuOpens: menuVisible === 'false',
    brokenImages,
    consoleErrors,
    axeViolations: accessibility.violations.map((violation) => ({ id: violation.id, impact: violation.impact })),
  });

  console.log(`checked ${viewport.name}`);

  await context.close();
  await browser.close();
}

const failures = results.flatMap((result) => {
  const items = [];
  if (result.metrics.horizontalOverflow > 1) items.push(`horizontal overflow ${result.metrics.horizontalOverflow}px`);
  if (result.metrics.contentTop < result.metrics.headerBottom) items.push('hero content behind navigation');
  if (result.metrics.gapBelowContent > Math.min(96, result.metrics.heroBottom * 0.12) + 2) items.push(`hero bottom gap ${result.metrics.gapBelowContent}px`);
  if (result.viewport.startsWith('390') || result.viewport.startsWith('360')) {
    if (result.metrics.mobileTextAlign !== 'center') items.push('mobile hero not centered');
  }
  if (!result.metrics.videoMuted) items.push('hero video is not muted');
  if (!result.founderMedia) items.push('founder video is missing');
  else {
    if (!result.founderMedia.muted) items.push('founder video is not muted');
    if (!result.founderMedia.playsInline) items.push('founder video is not playsInline');
    if (result.founderMedia.paused) items.push('founder video did not autoplay in view');
    if (!result.founderMedia.source.includes('ayham-founder-story.mp4')) items.push('founder video source is incorrect');
  }
  if (!result.locationMedia) items.push('location video is missing');
  else {
    if (result.locationMedia.paused) items.push('location video did not autoplay in view');
    if (!result.locationMedia.source.includes('ricefields-green-treeline.m4v')) items.push('location video source is unsupported');
  }
  if (result.brokenImages.length) items.push(`${result.brokenImages.length} broken image(s)`);
  if (!result.menuOpens) items.push('menu did not open');
  if (result.consoleErrors.length) items.push(`${result.consoleErrors.length} console error(s)`);
  if (result.axeViolations.length) items.push(`${result.axeViolations.length} axe violation(s)`);
  return items.map((message) => `${result.viewport}: ${message}`);
});

console.log(JSON.stringify({ results, failures }, null, 2));
if (failures.length) process.exitCode = 1;
