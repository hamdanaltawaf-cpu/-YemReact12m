// فحص المتصفح للوحة الإدارة: دخول + تنقّل بين التبويبات + لا أخطاء console
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const PASSWORD = process.env.YEMREACT_ADMIN_PASSWORD || 'yemreact-admin-dev-0001';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
});
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

let failures = 0;
const check = (name, ok) => { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (!ok) failures++; };

// 1) الدخول
await page.goto(BASE + '/admin', { waitUntil: 'networkidle', timeout: 20000 });
check('شاشة الدخول ظاهرة', await page.locator('#login-screen').isVisible());
await page.fill('#password', PASSWORD);
await page.click('#login-btn');
await page.waitForSelector('#app:not(.hidden)', { timeout: 8000 });
check('الدخول نجح (التطبيق ظاهر)', await page.locator('#app').isVisible());

// 2) نظرة عامة
await page.waitForSelector('#stat-cards .stat-card', { timeout: 8000 });
const statCount = await page.locator('#stat-cards .stat-card').count();
check(`الإحصائيات محمّلة (${statCount} بطاقات)`, statCount >= 4);

// 3) الرياكشنات
await page.click('.tab[data-view="reactions"]');
await page.waitForSelector('#r-list .r-row', { timeout: 8000 });
const rCount = await page.locator('#r-list .r-row').count();
check(`قائمة الرياكشنات محمّلة (${rCount} صف)`, rCount >= 10);

// بحث
await page.fill('#r-search', 'يا ساتر');
await page.waitForTimeout(500);
check('البحث يعمل', (await page.locator('#r-list .r-row').count()) >= 1);
await page.fill('#r-search', '');

// نافذة الرفع تفتح
await page.click('#open-upload');
check('نافذة الرفع تفتح', await page.locator('#modal-reaction').isVisible());
check('قوالب الكابشن ظاهرة', (await page.locator('#caption-tpls .tpl').count()) >= 5);
await page.click('#modal-reaction [data-close]');

// 4) المساهمات
await page.click('.tab[data-view="submissions"]');
await page.waitForSelector('#sub-list', { timeout: 8000 });
check('تبويب المساهمات يعمل', await page.locator('#sub-list').isVisible());

// 5) المحتوى
await page.click('.tab[data-view="content"]');
await page.waitForSelector('#cat-list .cat-item', { timeout: 8000 });
const catCount = await page.locator('#cat-list .cat-item').count();
check(`التصنيفات محمّلة (${catCount})`, catCount === 9);

// 6) السجل
await page.click('.tab[data-view="audit"]');
await page.waitForSelector('#audit-table', { timeout: 8000 });
check('سجل التدقيق يعمل', await page.locator('#audit-table tr').count() >= 1);

// النتيجة النهائية
check('لا أخطاء console', consoleErrors.length === 0);
check('لا أخطاء page', pageErrors.length === 0);
if (consoleErrors.length) console.log('  console:', consoleErrors.slice(0, 5));
if (pageErrors.length) console.log('  page:', pageErrors.slice(0, 5));

console.log(`\n${failures === 0 ? '✅ كل فحوص لوحة الإدارة نجحت' : `❌ ${failures} فحص فشل`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
