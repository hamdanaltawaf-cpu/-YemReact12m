-- ============================================================
-- الهجرة 0005 — نظام الإبلاغ (Takedown)
-- ============================================================
-- جدول البلاغات + تتبع حالة المراجعة القانونية للرياكشنات

CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reaction_id      UUID NOT NULL REFERENCES reactions(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,                       -- سبب البلاغ
  reporter_contact TEXT,                                -- تواصل المبلّغ (اختياري)
  reporter_email   TEXT,
  status           TEXT NOT NULL DEFAULT 'open',        -- open | resolved_published | resolved_deleted
  resolution_note  TEXT,                                -- ملاحظة قرار المسؤول
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reports_reaction ON reports (reaction_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
