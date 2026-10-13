# YemReact — دليل النشر والإنتاج (Deployment Guide)

> دليل كامل لنشر يمن رياكت على VPS مع Docker Compose، والنسخ الاحتياطي، والمراقبة.

---

## 1. المتطلبات

- خادم VPS (Hetzner/DigitalOcean — 2GB RAM تكفي للبداية) بنظام Debian/Ubuntu.
- Docker + Docker Compose.
- نطاق (domain) + شهادة TLS (عبر Caddy أو Nginx أو Cloudflare).

---

## 2. متغيرات البيئة المطلوبة

انسخ `.env.example` إلى `.env` واملأ القيم. **كل القيم التالية إلزامية في الإنتاج:**

| المتغير | الوصف | توليد آمن |
|---|---|---|
| `NODE_ENV` | `production` | — |
| `PORT` | `4173` (افتراضي) | — |
| `SITE_URL` | رابط الموقع العام (لـ OG) | `https://yemreact.com` |
| `DATABASE_URL` | لا حاجة لضبطه (يُحقن في compose) | — |
| `POSTGRES_PASSWORD` | كلمة سر قاعدة البيانات | `openssl rand -hex 32` |
| `SESSION_SECRET` | توقيع جلسة المستخدم | `openssl rand -hex 32` |
| `ADMIN_SECRET` | توقيع جلسة المسؤول | `openssl rand -hex 32` |
| `OTP_SALT` | ملح رموز الدخول | `openssl rand -hex 32` |
| `IP_SALT` | ملح تجزئة IP | `openssl rand -hex 32` |
| `YEMREACT_ADMIN_PASSWORD` | كلمة سر لوحة الإدارة | كلمة سر قوية ≥ 16 حرفًا |
| `MAIL_TRANSPORT` | `resend` للإنتاج (أو `dev` للتجربة) | — |
| `RESEND_API_KEY` | مفتاح Resend (إذا `resend`) | من لوحة Resend |
| `MAIL_FROM` | بريد المُرسِل | `YemReact <no-reply@...>` |
| `REBUILD_ON_PUBLISH` | `false` في Docker (البناء يتم عند النشر) | — |

> **الخادم يرفض الإقلاع في الإنتاج إذا كان أي سر مفقودًا/ضعيفًا** (فحص Security at boot).

---

## 3. خطوات النشر

### 3.1 بناء الواجهة (قبل بناء الصورة)

صفحات التفاصيل ثابتة (SSG)، لذا تُبنى الواجهة **مرة واحدة عند كل نشر**:

```bash
# محليًا أو على خادم البناء — يتطلب الـ API والبيانات حية
npm install
npm run db:setup          # يهجّر ويبذر
npm start &               # شغّل الـ API مؤقتًا للبناء
cd web && npm install && npm run build && cd ..
kill %1
```

### 3.2 بناء وتشغيل الحاويات

```bash
docker compose up -d --build
docker compose logs -f api
```

سيهجّر الخادم قاعدة البيانات ويبذر الفئات والرياكشنات تلقائيًا عند أول إقلاع.

### 3.3 الوكيل العكسي + TLS

وجّه النطاق إلى المنفذ `4173` عبر Caddy (أبسط) أو Nginx:

```caddy
yemreact.com {
    reverse_proxy 127.0.0.1:4173
}
```

### 3.4 بعد النشر

```bash
curl https://yemreact.com/api/v1/health   # يجب أن يعيد ok:true بكل الفحوص
```

---

## 4. النسخ الاحتياطي والاستعادة

### النسخ الاحتياطي (يومي عبر cron)

```bash
# أضف إلى crontab:   crontab -e
0 3 * * * cd /path/to/yemreact && ./scripts/backup.sh >> data/backups/backup.log 2>&1
```

ينتج: `data/backups/db-YYYYMMDD-HHMMSS.sql.gz` + `media-...tar.gz` (يحتفظ بآخر 14 نسخة).

### الاستعادة

```bash
./scripts/restore.sh data/backups/db-20260817-030000.sql.gz
# لاستعادة الوسائط معها:
RESTORE_MEDIA=1 ./scripts/restore.sh data/backups/db-20260817-030000.sql.gz
```

> **جرّب الاستعادة مرة قبل الإطلاق** للتأكد من سلامة الإجراء.

---

## 5. المراقبة

- **فحص الصحة:** `GET /api/v1/health` يتحقق من: قاعدة البيانات، التخزين، ffmpeg (وقدراته)، مساحة القرص، وملفات الواترمارك.
- **السجلات:** `docker compose logs -f api` — مستويات `info/warn/error` منظمة.
- **تنبيهات:** وجّه مراقب خارجي (UptimeRobot/Healthchecks.io) إلى `/api/v1/health` لتنبيهك عند التعطل.

---

## 6. تحديث المحتوى بعد النشر

- **إضافة رياكشنات دفعة واحدة:** `node scripts/import-content.mjs data/import.json` (انظر `docs/import-sample.json`).
- **إعادة بناء صفحات SSG** بعد الإدخال: `cd web && npm run build` (أو أعد نشر الحاوية).
- **إدارة يومية:** عبر لوحة الإدارة `/admin` (رفع/تعديل/مراجعة مساهمات/بلاغات).

---

## 7. جدول الميزات المكتملة

| الميزة | الحالة |
|---|---|
| مكتبة مصنّفة (9 فئات) + بحث بالموقف (تطبيع عربي) | ✅ |
| معالجة فيديو (ترميز + واترمارك + مصغّرة + كشف تكرار) | ✅ |
| لوحة إدارة كاملة (CRUD + مساهمات + مجموعات + مختار) | ✅ |
| مساهمات مجتمعية بإقرار ملكية + تتبع | ✅ |
| حسابات OTP بلا كلمة مرور + محفوظات متزامنة | ✅ |
| شارة "مساهِم موثوق" + إشعارات بريد | ✅ |
| إبلاغ/Takedown (تعليق فوري → مراجعة → حذف/نشر) | ✅ |
| أمان (CSP + CSRF + rate limiting + فحص ملفات + أسرار إجبارية) | ✅ |
| SEO/OpenGraph لكل رياكشن | ✅ |
| PWA (تثبيت + عمل دون اتصال جزئي) | ✅ |
| نسخ احتياطي + استعادة + مراقبة | ✅ |
| صفحات قانونية (خصوصية/شروط/إبلاغ) | ✅ |
| البحث الدلالي | ⏳ مؤجل (300+ رياكشن) |
