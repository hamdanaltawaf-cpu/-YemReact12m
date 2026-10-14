// نموذج إبلاغ عام (من صفحة /report أو زر "أبلغ" في التفاصيل)
import { useState, useEffect } from 'preact/hooks';

export default function ReportForm({ reactionId = null }) {
  const [rid, setRid] = useState(reactionId || '');
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // قراءة معرّف الرياكشن من ?rid= إن وُجد
  useEffect(() => {
    if (reactionId) return;
    const q = new URLSearchParams(window.location.search);
    const param = q.get('rid');
    if (param) setRid(param);
  }, [reactionId]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const id = rid.trim();
    if (!id) { setError('أدخل معرّف الرياكشن (مثل YR-0001)'); return; }
    if (!reason.trim()) { setError('اكتب سبب البلاغ'); return; }

    setSending(true);
    try {
      const res = await fetch(`/api/v1/reactions/${id}/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), contact: contact.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'فشل الإبلاغ');
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  };

  if (done) {
    return (
      <div class="success-box">
        <div class="success-mark">✓</div>
        <p>استلمنا بلاغك. عُلّق الرياكشن مؤقتًا للمراجعة.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} class="report-form">
      {!reactionId && (
        <label class="field">
          <span>معرّف الرياكشن (YR-0001)</span>
          <input class="text-input" value={rid} onInput={(e) => setRid(e.target.value)} placeholder="YR-0001" />
        </label>
      )}
      <label class="field">
        <span>سبب البلاغ</span>
        <textarea class="text-area" rows={3} value={reason} onInput={(e) => setReason(e.target.value)}
          placeholder="مثال: هذا المحتوى ملك لي وأطلب إزالته" />
      </label>
      <label class="field">
        <span>تواصلك (اختياري)</span>
        <input class="text-input" value={contact} onInput={(e) => setContact(e.target.value)} placeholder="بريد/هاتف" />
      </label>
      {error && <p class="form-error">{error}</p>}
      <button class="btn-primary" type="submit" disabled={sending}>
        {sending ? 'جاري الإرسال...' : 'أرسل البلاغ'}
      </button>
    </form>
  );
}
