-- ============================================================
-- الهجرة 0001 — المخطط الأساسي لقاعدة البيانات
-- ============================================================
-- الكيانات: التصنيفات، الرياكشنات، الأحداث، المساهمات، الحسابات،
-- رموز OTP، المحفوظات، المجموعات، الإعدادات، وسجل التدقيق.
-- ملاحظة: المعرّفات الداخلية UUID، ومعرّف العرض البشري (YR-####) منفصل.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- التصنيفات (9 فئات مقفلة)
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,            -- laugh | shock | ...
  name       TEXT NOT NULL,               -- الاسم العربي
  color      TEXT NOT NULL,               -- لون الفئة (من التوكنز)
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الرياكشنات
CREATE TABLE IF NOT EXISTS reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id      TEXT UNIQUE NOT NULL,           -- YR-0001 (معرّف عرض بشري)
  slug            TEXT UNIQUE NOT NULL,           -- للمسارات/الـSEO لاحقًا
  category_id     TEXT NOT NULL REFERENCES categories(id),
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
  caption         TEXT NOT NULL,                  -- الكابشن/الاقتباس (≤40 حرف)
  situation       TEXT NOT NULL,                  -- الموقف (≤120)
  description     TEXT,                           -- وصف مختصر
  keywords        TEXT[] NOT NULL DEFAULT '{}',   -- كلمات مفتاحية بالعامية
  duration        INTEGER NOT NULL DEFAULT 0,     -- بالثواني
  corner          TEXT NOT NULL DEFAULT 'tr',     -- tr | tl (قلب الكتلة)
  source          TEXT,
  source_url      TEXT,
  source_found_at TIMESTAMPTZ,
  reviewer        TEXT,                           -- اسم المراجع
  rights_status   TEXT NOT NULL DEFAULT 'under_review', -- licensed|documented_permission|original_submission|under_review|rejected
  content_hash    TEXT,                           -- تجزئة الملف لكشف التكرار
  video_key       TEXT,                           -- مفتاح التخزين للفيديو المعالج
  thumb_key       TEXT,                           -- مفتاح التخزين للمصغّرة
  codec           TEXT,
  width           INTEGER,
  height          INTEGER,
  fps             REAL,
  size_bytes      BIGINT,
  has_watermark   BOOLEAN NOT NULL DEFAULT FALSE,
  -- عدّادات مجمّعة (مصدرها جدول الأحداث، تُحدَّث بنفس المعاملة)
  views_count     INTEGER NOT NULL DEFAULT 0,
  saves_count     INTEGER NOT NULL DEFAULT 0,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  shares_count    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reactions_category ON reactions (category_id);
CREATE INDEX IF NOT EXISTS idx_reactions_status ON reactions (status);
CREATE INDEX IF NOT EXISTS idx_reactions_keywords ON reactions USING GIN (keywords);

-- الأحداث الخام (المصدر الوحيد لحقيقة العدّادات)
CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  reaction_id UUID NOT NULL REFERENCES reactions(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,               -- view | save | download | share
  session_id  TEXT,
  ip_hash     TEXT,                        -- SHA-256 مقطّع، لا IP خام
  user_agent  TEXT,
  meta        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_reaction ON events (reaction_id, type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events (created_at);

-- مساهمات المستخدمين
CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,          -- SUB-XXXXXXXX
  user_id       UUID,
  session_id    TEXT,
  contact       TEXT,
  caption       TEXT,
  situation     TEXT,
  category_id   TEXT,
  source        TEXT,
  video_key     TEXT,
  thumb_key     TEXT,
  duration      INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reject_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ
);

-- حسابات المستخدمين (بلا كلمة مرور)
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,         -- lowercase
  role       TEXT NOT NULL DEFAULT 'user', -- user | admin (للمستقبل)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- رموز الدخول لمرة واحدة (OTP)
CREATE TABLE IF NOT EXISTS auth_codes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,                -- SHA-256(code + salt)
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_codes_user ON auth_codes (user_id, used, expires_at);

-- المحفوظات (جدول حقيقي بفهرس — كثير لكثير)
CREATE TABLE IF NOT EXISTS saved_reactions (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_id UUID NOT NULL REFERENCES reactions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reaction_id)
);

-- المجموعات (يحرّرها المسؤول)
CREATE TABLE IF NOT EXISTS collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- عضوية المجموعات
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  reaction_id   UUID NOT NULL REFERENCES reactions(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, reaction_id)
);

-- الإعدادات (key/value)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- سجل التدقيق
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,                -- login | create | update | ...
  target     TEXT,
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
