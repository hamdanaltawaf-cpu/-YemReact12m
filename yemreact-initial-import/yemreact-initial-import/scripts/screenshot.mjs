// لقطات شاشة للمعاينة — يحفظ صورًا في docs/screenshots/
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:4173';
const outDir = 'docs/screenshots';
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  { name: 'home-desktop', url: '/', viewport: { width: 1280, height: 900 } },
  { name: 'home-mobile', url: '/', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'detail-desktop', url: '/r/yr-0002', viewport: { width: 1280, height: 900 } },
];

for (const s of shots) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: s.viewport,
    userAgent: s.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    ...(s.mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();
  await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${s.name}.png`, fullPage: false });
  console.log(`✓ ${s.name}.png`);
  await browser.close();
}
