# مرجع الـ API (الإصدار v1)

> المسار الأساسي: `/api/v1`. كل الاستجابات JSON. الأخطاء بصيغة موحّدة:
> `{ "error": { "code": "STRING", "message": "رسالة عربية", "details?": {...} } }`

## شكل الرياكشن (Reaction)

```jsonc
{
  "id": "YR-0001",
  "cat": "shock",
  "status": "published",
  "quote": "يا ساتر!",
  "situation": "لما تسمع خبر صادم",
  "desc": null,
  "keywords": ["خبر", "مفاجأة"],
  "dur": 2,
  "corner": "tr",                 // tr | tl
  "source": null, "sourceUrl": null,
  "video": "/media/...",           // null حتى P2
  "thumb": null,
  "stats": { "views": 0, "saves": 0, "downloads": 0, "shares": 0 },
  "publishedAt": "2026-08-17T00:00:00.000Z"
}
```

## عامة

| Method | Path | Query/Body | الوصف |
|---|---|---|---|
| GET | `/health` | — | `{ ok, service, env, db, time }` |
| GET | `/api/v1/categories` | — | `{ categories: [{id,name,color,sort_order}] }` |
| GET | `/api/v1/reactions` | `cat`, `q`, `limit` | `{ query, category, count, reactions }` |
| GET | `/api/v1/reactions/:id` | — | `{ reaction, related[] }` (404 بصيغة موحّدة) |

> ملاحظة البحث: `q` يُطبَّع عربيًا (إزالة تشكيل، توحيد الألف/الياء/التاء) قبل المطابقة
> ضد `search_text` + `display_id`.

## المصادقة (مستخدم — OTP)

| Method | Path | Body | الوصف |
|---|---|---|---|
| POST | `/api/v1/auth/request-code` | `{ email }` | يرسل رمزًا؛ في غير الإنتاج يرجعه `devCode` |
| POST | `/api/v1/auth/verify` | `{ email, code }` | يضبط كوكي `yr_auth` (60 يومًا) + `{ ok, user }` |
| GET | `/api/v1/auth/me` | — | `{ user: {id,email,role} | null }` |
| POST | `/api/v1/auth/logout` | — | `{ ok }` |
| GET | `/api/v1/me/saved` | — | `{ saved: string[] }` (401 بلا جلسة) |
| POST | `/api/v1/me/saved` | `{ reactionId, saved }` | حفظ/إزالة |
| POST | `/api/v1/me/saved/migrate` | `{ reactionIds }` | ترحيل محفوظات الضيف |
| GET | `/api/v1/me/submissions` | — | `{ submissions, trusted }` |

## المساهمات (عامة)

| Method | Path | Body | الوصف |
|---|---|---|---|
| POST | `/api/v1/submissions` | multipart | رفع مساهمة (فيديو + موقف + إقرار ملكية) |
| GET | `/api/v1/submissions/:id` | — | استعلام الحالة برقم التتبع |

حقول الرفع: `file`*، `situation`*، `ownership`* ("true")، `caption`، `category`، `source`، `email`.

## الإدارة (تتطلب كوكي `yr_admin`)

| Method | Path | Body | الوصف |
|---|---|---|---|
| POST | `/api/v1/admin/login` | `{ password }` | يضبط كوكي `yr_admin` (8 ساعات) |
| POST | `/api/v1/admin/logout` | — | `{ ok }` |
| GET | `/api/v1/admin/me` | — | `{ authenticated }` |
| GET | `/api/v1/admin/stats` | — | `{ stats: { byStatus, totalViews } }` |
| POST | `/api/v1/admin/reactions` | multipart | رفع رياكشن + معالجة كاملة |
| GET | `/api/v1/admin/reactions` | `status`, `q`, `cat`, `page`, `pageSize` | قائمة مرقّمة (كل الحالات) |
| GET | `/api/v1/admin/reactions/:id` | — | تفاصيل بأي حالة |
| PATCH | `/api/v1/admin/reactions/:id` | حقول المحتوى | تعديل (كابشن/موقف/تصنيف/كلمات/مصدر/زاوية) |
| PATCH | `/api/v1/admin/reactions/:id/status` | `{ status }` | نشر/مسودة/أرشفة |
| GET | `/api/v1/admin/submissions` | `status` | قائمة المساهمات |
| POST | `/api/v1/admin/submissions/:id/approve` | `{ overrides? }` | قبول ونشر |
| POST | `/api/v1/admin/submissions/:id/reject` | `{ reason }` | رفض بسبب |
| GET | `/api/v1/admin/categories` | — | قائمة كاملة |
| PATCH | `/api/v1/admin/categories/:id` | `{ name, description, sortOrder }` | تعديل (اللون مقفل) |
| GET/POST/PATCH/DELETE | `/api/v1/admin/collections[/:id]` | — | إدارة المجموعات |
| GET/POST/DELETE | `/api/v1/admin/collections/:id/items` | `{ reactionId }` | عضوية المجموعة |
| GET/POST | `/api/v1/admin/featured` | `{ reactionIds }` | مختار الأسبوع (متعدد) |
| GET | `/api/v1/admin/audit` | `limit` | سجل التدقيق |

### رفع رياكشن (multipart/form-data)

| الحقل | مطلوب | الوصف |
|---|---|---|
| `file` | ✅ | ملف الفيديو (≤80MB، mp4/webm/…) |
| `category` | ✅ | معرّف التصنيف (laugh, shock, …) |
| `caption` | ✅ | الكابشن/الاقتباس (≤40 حرف) |
| `situation` | ✅ | الموقف (≤120 حرف) |
| `description` | | وصف مختصر |
| `keywords` | | مفصولة بفاصلة أو سطر جديد |
| `corner` | | `tr` (افتراضي) أو `tl` (قلب الكتلة) |
| `source` / `sourceUrl` | | المصدر |
| `status` | | `published` (افتراضي) أو `draft` |

الاستجابة: `201 { ok, reaction }`. المعالجة تلقائية: ترميز + واترمارك + مصغّرة +
مدة + تجزئة. **التكرار يُرفض 409** (`CONFLICT`).

### خدمة الوسائط (عامة)

| Method | Path | الوصف |
|---|---|---|
| GET | `/media/*` | يقرأ من التخزين؛ يدعم `Range` (206) و`video/mp4`/`image/webp` |

> مسارات CRUD المتبقية (تعديل/أرشفة/مساهمات/مجموعات) تأتي في P4–P5.

## رموز الأخطاء

| code | HTTP | الوصف |
|---|---|---|
| `BAD_REQUEST` | 400 | طلب ناقص/غير صالح |
| `UNAUTHORIZED` | 401 | جلسة غير صالحة / كلمة سر أو رمز خاطئ |
| `FORBIDDEN` | 403 | صلاحية غير كافية |
| `NOT_FOUND` | 404 | مورد غير موجود |
| `RATE_LIMITED` | 429 | تجاوز معدل الطلبات |
| `INTERNAL` | 500 | خطأ غير متوقع (مخفي التفاصيل) |
