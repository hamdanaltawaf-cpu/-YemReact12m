-- ============================================================
-- الهجرة 0004 — إقرار الملكية وبريد التواصل في المساهمات
-- ============================================================
-- ownership_attested: إقرار صاحب المساهمة بحق الإرسال ومنح ترخيص استخدام (إلزامي)
-- contact_email: بريد التواصل لإشعار المساهم بحالة مساهمته (اختياري)

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ownership_attested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS contact_email TEXT;
