// فحص الإطلاق النهائي: واجهة + لوحة + حساب + صفحات قانونية + PWA
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const PASSWORD = process.env.YEMREACT_ADMIN_PASSWORD || 'yemreact-admin-dev-0001';

const browser = await chromium.launch();
let failures = 0;
const results = [];

async function runViewport(name, opts) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const check = (n, ok) => { results.push(`  ${ok ? '✓' : '✗'} ${n}`); if (!ok) failures++; };

  // الواجهة العامة
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('.grid .card', { timeout: 15000 }).catch(() => {});
  check('رئيسية: بطاقات تُحمَّل', (await page.locator('.grid .card').count()) > 0);
  check('رئيسية: تذييل قانوني', await page.locator('.footer-links a[href="/privacy"]').isVisible());

  // صفحة تفاصيل + زر إبلاغ
  await page.goto(BASE + '/r/yr-0001', { waitUntil: 'networkidle' });
  check('تفاصيل: زر "أبلغ عن محتوى"', await page.locator('.report-link').isVisible());

  // الصفحات القانونية
  await page.goto(BASE + '/privacy', { waitUntil: 'networkidle' });
  check('الخصوصية: عنوان', (await page.locator('.legal-title').textContent()).includes('الخصوصية'));
  await page.goto(BASE + '/terms', { waitUntil: 'networkidle' });
  check('الشروط: عنوان', (await page.locator('.legal-title').textContent()).includes('شروط'));
  await page.goto(BASE + '/report', { waitUntil: 'networkidle' });
  check('الإبلاغ: نموذج', await page.locator('.report-form').isVisible());

  // PWA: manifest + service worker
  const hasManifest = await page.evaluate(() => !!document.querySelector('link[rel="manifest"]'));
  check('PWA: manifest مربوط', hasManifest);
  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  check('PWA: service worker مسجّل', swRegistered);

  // لوحة الإدارة
  await page.goto(BASE + '/admin/', { waitUntil: 'networkidle' });
  await page.fill('#password', PASSWORD);
  await page.click('#login-btn');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 8000 });
  check('لوحة: دخول', await page.locator('#app').isVisible());
  await page.click('.tab[data-view="reports"]');
  await page.waitForSelector('#report-list', { timeout: 8000 });
  check('لوحة: تبويب البلاغات', await page.locator('#report-list').isVisible());

  check('لا أخطاء console', consoleErrors.length === 0);
  check('لا أخطاء page', pageErrors.length === 0);
  if (consoleErrors.length) console.log('  [console]', consoleErrors.slice(0, 4));

  console.log(`\n=== ${name} ===`);
  console.log(results.splice(0).join('\n'));
  await context.close();
}

await runViewport('ديسكتوب', {
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
});
await runViewport('موبايل', {
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
});

console.log(`\n${failures === 0 ? '✅ فحص الإطلاق النهائي نجح بالكامل' : `❌ ${failures} فحص فشل`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
