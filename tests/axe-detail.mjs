import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: {
    width: Number(process.env.QA_WIDTH || 1440),
    height: Number(process.env.QA_HEIGHT || 900),
  },
});
const page = await context.newPage();
await page.goto(process.env.QA_URL || 'http://127.0.0.1:4179', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
if (process.env.QA_SCROLL) {
  await page.locator(process.env.QA_SCROLL).scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
}
const result = await new AxeBuilder({ page }).analyze();
console.log(JSON.stringify(result.violations.map(({ id, impact, help, nodes }) => ({
  id,
  impact,
  help,
  nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
})), null, 2));
await browser.close();
