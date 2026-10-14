# يمن رياكت — YemReact

> مكتبة رياكشنات يمنية مصنّفة حسب **المواقف**، منتقاة يدويًا.
> **خذها. حطها. يمنية.** 🇾🇪

هذا المستودع هو **البناء النظيف من المواصفة** (ليس ترقيعًا للنموذج الأولي)، مبني على
مبدأ واحد: **المحتوى والانتقاء هما الخندق التنافسي، لا التقنية**.

---

## الحالة الحالية (المسار)

| المرحلة | الحالة |
|---|---|
| **P0 — التوطئة وتوحيد المرجع البصري** | ✅ مكتملة |
| **P1 — البنية التحتية والأمان** | ✅ مكتملة |
| P2 — معالجة الميديا (ffmpeg + واترمارك) | ✅ مكتملة |
| P3 — المكتبة والاكتشاف (Astro SSG + Preact) | ✅ مكتملة |
| P4 — لوحة الإدارة الكاملة | ✅ مكتملة |
| P5 — المجتمع والحسابات | ✅ مكتملة |
| P6 — النمو والقانون والإطلاق | ✅ مكتملة |
| P7 — الذكاء (بحث دلالي) | مؤجّلة حتى 300+ رياكشن |

تفاصيل القرارات والخطط في [`docs/DECISIONS.md`](docs/DECISIONS.md)، وسجل الإنجاز في [`PROGRESS.md`](PROGRESS.md).

---

## البنية التقنية

- **الخادم:** Node.js ≥ 20 + [Fastify 5](https://fastify.dev) (ESM).
- **قاعدة البيانات:** PostgreSQL (مع هجرات SQL وbذر آمن للتكرار).
- **الطبقات:** `Repository → Service → Route` (لا SQL في الروتات، لا منطق عمل فيها).
- **واجهات قابلة للتبديل:** التخزين (قرص محلي الآن → R2/S3 لاحقًا)، البريد (Dev → SMTP)،
  المعالجة (ffmpeg في P2) — كلها خلف `interface` واحد.
- **المصادقة:** مستخدم عبر OTP/Magic Link (بلا كلمة مرور) · مسؤول عبر كلمة سر بيئية + جلسة موقّعة HMAC.
- **الأخطاء:** صيغة موحّدة `{ error: { code, message } }`.
- **الأمان:** فحص الأسرار عند الإقلاع (Security at boot)، rate-limiting، cookies HttpOnly/SameSite،
  تجزئة IP بملح، مقارنات آمنة زمنيًا.

## هيكل المشروع

```
yemreact/
├─ src/
│  ├─ server.js              # نقطة الدخول (فحص أسرار + إقلاع + إغلاق أنيق)
│  ├─ app.js                 # بناء تطبيق Fastify (حقن التبعيات)
│  ├─ config.js              # الإعدادات + فحص الأسرار
│  ├─ tokens/                # P0: التوكنز البصرية المقفلة (المصدر الوحيد)
│  ├─ lib/                   # errors, crypto, session, arabic (تطبيع), search
│  ├─ db/                    # pool, migrate, migrations/*.sql
│  ├─ seed/                  # البذر (9 فئات + 12 رياكشن + مجموعات)
│  ├─ repositories/          # طبقة البيانات (categories, reactions, users, ...)
│  ├─ services/              # auth.service, admin.service
│  ├─ interfaces/            # storage, mail, media (قابلة للتبديل)
│  └─ routes/                # health, public, auth, admin
├─ test/                     # وحدة + تكامل (ضد Postgres حقيقي)
├─ docs/                     # DECISIONS, ARCHIVE, API
├─ Dockerfile · docker-compose.yml
└─ README.md · PROGRESS.md
```

---

## التشغيل محليًا (تطوير)

### المتطلبات
- Node.js ≥ 20 (يُفضّل 22)
- PostgreSQL ≥ 14 يعمل محليًا (أو عبر Docker)

### 1) جهّز قاعدة البيانات

```bash
sudo -u postgres psql -c "CREATE ROLE yemreact LOGIN PASSWORD 'yemreact_dev';"
sudo -u postgres createdb -O yemreact yemreact
```

### 2) جهّز البيئة

```bash
cp .env.example .env
# عدّل DATABASE_URL والأسرار (للتطوير تكفي القيم في المثال)
```

### 3) ثبّت وشغّل

```bash
npm install
npm run db:setup     # يهجّر + يبذر (9 فئات + 12 رياكشن)
npm run dev          # خادم تطوير بمراقبة التغييرات
```

الخادم يستمع على `http://localhost:4173`.

### 4) الاختبارات

```bash
npm test                    # كل الاختبارات (وحدة + تكامل ضد قاعدة yemreact_test)
npm run test:unit           # وحدة فقط
npm run test:integration    # تكامل فقط
```

> ملاحظة: اختبارات التكامل تتطلب قاعدة بيانات `yemreact_test` (تُنشأ بنفس بيانات التطوير).

---

## الواجهة العامة (مجلد `web/` — Astro SSG)

الواجهة مشروع منفصل داخل نفس المستودع، مبني بـ Astro (توليد ثابت) + جزر Preact.

### التطوير المحلي (منفذان: الواجهة 4321 + الـ API 4173)

```bash
# 1) شغّل الـ API أولًا (يفترض قاعدة بيانات جاهزة)
npm install && npm run db:setup && npm start   # على 4173

# 2) في نافذة ثانية: شغّل الواجهة (تمرّر /api و/media إلى 4173 تلقائيًا)
cd web && npm install && npm run dev           # على 4321
```

افتح `http://localhost:4321`.

### البناء للإنتاج (منفذ واحد — الخادم يخدم الواجهة والـ API معًا)

```bash
# يبني صفحات ثابتة (يجلب بيانات الرياكشنات من الـ API أثناء البناء)
# يتطلب الـ API يعمل على http://localhost:4173 (أو اضبط PUBLIC_API_BASE)
cd web && npm run build

# ثم شغّل الخادم — يخدم الواجهة المبنية + الـ API + الوسائط على 4173
npm start
```

ملاحظات:
- **توليد التوكنز:** `npm --prefix web run gen:tokens` يولد `web/src/styles/tokens.css`
  من `design-tokens.js` (المصدر الوحيد للهوية).
- **صفحات التفاصيل ثابتة (SSG):** بعد نشر رياكشن جديد من لوحة الإدارة، أعد البناء
  لتحديث صفحة تفاصيله ووسوم OG (الرئيسية تحدّث نفسها حيًّا).
- **فحص المتصفح:** `node scripts/browser-check.mjs` يفحص عدم وجود أخطاء console على
  ديسكتوب وموبايل (يتطلب Playwright مثبّتًا: `npx playwright install chromium`).

## لوحة الإدارة

لوحة SPA منفصلة (Vanilla JS، لا إطار) محمية بجلسة المسؤول، على `/admin`.

- **الدخول:** كلمة السر البيئية `YEMREACT_ADMIN_PASSWORD` (جلسة HMAC، 8 ساعات).
- **التبويبات:** نظرة عامة (إحصائيات حقيقية + رسوم بسيطة) · الرياكشنات (رفع/تعديل/
  نشر/أرشفة) · المساهمات (قبول/رفض) · المحتوى (تصنيفات/مجموعات/مختار) · السجل.
- **اختصارات لوحة المفاتيح (في مراجعة المساهمات):** `A` قبول · `R` رفض · `←/→` تنقّل.
- **خطاف إعادة البناء:** النشر/التعديل يعيد بناء صفحات SSG تلقائيًا (مفعّل خارج الإنتاج؛
  في الإنتاج داخل Docker يُبنى عبر خطوة نشر — راجع PROGRESS).

### إعادة بناء التوكنز بعد أي تعديل على الهوية

```bash
npm --prefix web run gen:tokens   # يولد tokens.css + brand.js للواجهة ولوحة الإدارة
```

## المساهمات والحسابات (P5)

- **"أرسل رياكشن"** (زر عائم في الرئيسية): 3 حقول + إقرار ملكية إلزامي → حالة Pending →
  مراجعة المسؤول. رقم تتبع `SUB-XXXXXXXX` للمتابعة.
- **حساب بلا كلمة مرور:** دخول OTP على `/account` (بريد → رمز). محفوظات متزامنة +
  مساهماتي + شارة "مساهِم موثوق" (3+ مساهمات مقبولة).
- **البريد:** وضع `dev` (مجاني، الرمز يظهر في السجل/الواجهة). للإنتاج: `MAIL_TRANSPORT=resend`
  + `RESEND_API_KEY=...` (أو أي مزود عبر `src/interfaces/mail.js`).

## النشر (Docker Compose — VPS)

```bash
cp .env.example .env
# املأ الأسرار بقيم قوية:
#   openssl rand -hex 32   (لكل من SESSION_SECRET / ADMIN_SECRET / OTP_SALT / IP_SALT)
#   وكلمة سر إدارة قوية لـ YEMREACT_ADMIN_PASSWORD

docker compose up -d --build
docker compose logs -f api
```

سيتحقق الخادم عند الإقلاع من أن الأسرار قوية (وإلا يرفض البدء)، ثم يهجّر ويبذر تلقائيًا.

> **الدليل الكامل** (متغيرات البيئة، خطوات النشر، النسخ الاحتياطي والاستعادة، المراقبة):
> راجع [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). وقائمة تدقيق الإطلاق في [`docs/LAUNCH.md`](docs/LAUNCH.md).

---

## واجهة الـ API (الرئيسية)

| Method | Path | الوصف |
|---|---|---|
| GET | `/health` | فحص الصحة (خادم + قاعدة بيانات) |
| GET | `/api/v1/categories` | الفئات التسع |
| GET | `/api/v1/reactions?cat=&q=&limit=` | قائمة الرياكشنات (فلترة + بحث) |
| GET | `/api/v1/reactions/:id` | تفاصيل رياكشن + رياكشنات قريبة |
| POST | `/api/v1/auth/request-code` | طلب رمز دخول (OTP) |
| POST | `/api/v1/auth/verify` | تحقق من الرمز → جلسة |
| GET | `/api/v1/auth/me` | المستخدم الحالي |
| POST | `/api/v1/auth/logout` | خروج |
| GET | `/api/v1/me/saved` | محفوظاتي |
| POST | `/api/v1/me/saved` | حفظ/إزالة |
| POST | `/api/v1/admin/login` | دخول المسؤول |
| GET | `/api/v1/admin/me` | حالة جلسة المسؤول |
| GET | `/api/v1/admin/stats` | إحصائيات أساسية |
| POST | `/api/v1/admin/reactions` | رفع رياكشن (multipart + معالجة كاملة) |
| GET | `/api/v1/admin/reactions` | قائمة الإدارة (كل الحالات) |
| GET | `/media/*` | خدمة الوسائط (فيديو/مصغّرة + Range) |

المرجع الكامل في [`docs/API.md`](docs/API.md).

---

## الهوية البصرية (مقفلة)

كل القيم البصرية (الألوان، الخطوط، علامة القُصاصة، قالب الكليب، ألوان الفئات) مشتقة من
`src/tokens/design-tokens.js` — وهي الترجمة الحرفية لـ **YemReact Brand v1.0 LOCKED**.
لا تُعدّل أي قيمة هناك إلا بقرار موثّق في `docs/DECISIONS.md`.
