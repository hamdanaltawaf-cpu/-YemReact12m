// فحص متصفح P5: الزر العائم + نافذة المساهمة + صفحة الحساب + دورة OTP
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const EMAIL = `tester-${Date.now()}@example.com`;

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

// 1) الصفحة الرئيسية + الزر العائم + نافذة المساهمة
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 20000 });
check('الزر العائم "أرسل رياكشن" ظاهر', await page.locator('.fab').isVisible());
await page.click('.fab');
await page.waitForSelector('.modal-box', { timeout: 5000 });
check('نافذة المساهمة تفتح', await page.locator('.modal-box').isVisible());
check('حقل الموقف موجود', await page.locator('.submit-form input[maxlength="120"]').isVisible());
check('إقرار الملكية موجود', await page.locator('.checkbox input').isVisible());
check('قوالب الموقف موجودة', (await page.locator('.tpl').count()) >= 3);
await page.keyboard.press('Escape');
await page.locator('.modal-actions .btn-secondary').click().catch(() => {});
check('النافذة تُغلق', await page.locator('.modal-box').count() === 0 || !(await page.locator('.modal-box').isVisible().catch(() => false)));

// 2) صفحة الحساب — شاشة الدخول
await page.goto(BASE + '/account', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForSelector('.auth-form', { timeout: 8000 });
check('شاشة الدخول (بريد) ظاهرة', await page.locator('.auth-form input[type="email"]').isVisible());

// 3) دورة OTP كاملة (نلتقط devCode من الاستجابة)
let devCode = null;
page.on('response', async (resp) => {
  if (resp.url().includes('/auth/request-code') && resp.status() === 200) {
    const body = await resp.json().catch(() => ({}));
    if (body.devCode) devCode = body.devCode;
  }
});
await page.fill('.auth-form input[type="email"]', EMAIL);
await page.click('.auth-form .btn-primary');
await page.waitForTimeout(500);
check('انتقلنا لخطوة الرمز', await page.locator('.auth-form input[maxlength="6"]').isVisible());
check('devCode التُقط (وضع تطوير)', Boolean(devCode));

await page.fill('.auth-form input[maxlength="6"]', devCode);
await page.click('.auth-form .btn-primary');
await page.waitForSelector('.account', { timeout: 8000 });
check('الدخول نجح (عرض الحساب)', await page.locator('.account').isVisible());
check('البريد معروض', (await page.locator('.account-email').textContent()).includes(EMAIL));
check('قسم المحفوظات موجود', await page.locator('.account .section').first().isVisible());
check('قسم المساهمات موجود', (await page.locator('.account .section').count()) >= 2);

// 4) الرجوع للرئيسية — الزر العائم ما زال يعمل والهيدر يظهر "حسابي"
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
check('رابط "حسابي" في الهيدر', await page.locator('.header-links a[href="/account"]').isVisible());

check('لا أخطاء console', consoleErrors.length === 0);
check('لا أخطاء page', pageErrors.length === 0);
if (consoleErrors.length) console.log('  console:', consoleErrors.slice(0, 5));
if (pageErrors.length) console.log('  page:', pageErrors.slice(0, 5));

console.log(`\n${failures === 0 ? '✅ كل فحوص P5 نجحت' : `❌ ${failures} فحص فشل`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
