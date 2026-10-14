// فحص المتصفح: يتأكد من عدم وجود أخطاء console وصحة تحميل المحتوى
// على ديسكتوب وموبايل (على خادم التشغيل). الاستخدام: node scripts/browser-check.mjs [url]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:4173';

const viewports = [
  { name: 'ديسكتوب', width: 1280, height: 800 },
  { name: 'موبايل', width: 390, height: 844, isMobile: true, hasTouch: true },
];

let failures = 0;

for (const vp of viewports) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    userAgent: vp.isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    ...(vp.isMobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} (${r.failure()?.errorText})`));

  // --- الصفحة الرئيسية ---
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('.grid .card', { timeout: 15000 }).catch(() => {});
  const cardCount = await page.locator('.grid .card').count();
  const searchVisible = await page.locator('.search-input').isVisible().catch(() => false);

  // --- صفحة التفاصيل ---
  await page.goto(BASE + '/r/yr-0001', { waitUntil: 'networkidle', timeout: 20000 });
  const h1 = await page.locator('h1.detail-quote').textContent().catch(() => null);
  const btnCount = await page.locator('.action-row button').count();

  // --- البحث التفاعلي ---
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.fill('.search-input', 'صادم');
  await page.waitForTimeout(500);
  const searchResults = await page.locator('.grid .card').count();

  const ok = consoleErrors.length === 0 && pageErrors.length === 0 && cardCount > 0;
  if (!ok) failures++;

  console.log(`\n=== ${vp.name} (${vp.width}×${vp.height}) ===`);
  console.log(`  بطاقات الشبكة: ${cardCount}`);
  console.log(`  البحث ظاهر: ${searchVisible}`);
  console.log(`  h1 التفاصيل: "${h1}"`);
  console.log(`  أزرار الأفعال: ${btnCount}`);
  console.log(`  نتائج البحث "صادم": ${searchResults}`);
  console.log(`  أخطاء console: ${consoleErrors.length}`, consoleErrors.length ? consoleErrors : '');
  console.log(`  أخطاء page: ${pageErrors.length}`, pageErrors.length ? pageErrors : '');
  console.log(`  طلبات فاشلة: ${failedRequests.length}`, failedRequests.length ? failedRequests.slice(0, 3) : '');
  console.log(`  → ${ok ? 'PASS ✓' : 'FAIL ✗'}`);

  await browser.close();
}

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`);
process.exit(failures === 0 ? 0 : 1);
