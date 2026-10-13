-- ============================================================
-- الهجرة 0006 — توحيد مع نسخة Manus: تحسين البحث + الاستعلامات الفاشلة
-- ============================================================
-- search_optimizer: نص موسّع يُكتب يدويًا لتحسين البحث باللهجة اليمنية
--   (كلمات مفتاحية ومرادفات تتجاوز الكابشن/الموقف — مسترد من نسخة Manus).
-- semantic_model: عمود مهيّأ للبحث الدلالي المستقبلي (null حاليًا — مؤجل حتى 300+).
-- failed_searches: تسجيل الاستعلامات التي تعيد صفر نتيجة (لتغذية الفهرس وطابور المحتوى).

ALTER TABLE reactions ADD COLUMN IF NOT EXISTS search_optimizer TEXT;
ALTER TABLE reactions ADD COLUMN IF NOT EXISTS semantic_model TEXT;

CREATE TABLE IF NOT EXISTS failed_searches (
  id          BIGSERIAL PRIMARY KEY,
  query       TEXT NOT NULL,
  normalized  TEXT NOT NULL,
  results     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_failed_searches_norm ON failed_searches (normalized);
CREATE INDEX IF NOT EXISTS idx_failed_searches_created ON failed_searches (created_at DESC);
