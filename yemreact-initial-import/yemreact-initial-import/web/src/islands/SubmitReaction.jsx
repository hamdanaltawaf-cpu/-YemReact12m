// ============================================================
// جزيرة "أرسل رياكشن" — نافذة رفع مساهمة من 3 حقول + إقرار ملكية
// ============================================================
import { useState } from 'preact/hooks';
import { categories } from '../lib/tokens.js';

const SEED_SITUATIONS = [
  'لمّا صاحبك يقول بكرة',
  'لما حد يهرّجك بموقف',
  'في القروب لما...',
  'لما تسمع خبر ما توقعته',
];

export default function SubmitReaction() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [situation, setSituation] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [email, setEmail] = useState('');
  const [ownership, setOwnership] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [trackingId, setTrackingId] = useState(null);

  const reset = () => {
    setFile(null); setSituation(''); setCaption(''); setCategory('');
    setSource(''); setEmail(''); setOwnership(false); setError(null); setTrackingId(null);
  };

  const close = () => { setOpen(false); reset(); };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!file) { setError('أرفق ملف فيديو'); return; }
    if (!situation.trim()) { setError('اكتب الموقف (لمّا... / اقتباس)'); return; }
    if (!ownership) { setError('يجب الإقرار بحقك في إرسال الفيديو'); return; }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('situation', situation.trim());
      fd.append('caption', caption.trim());
      fd.append('category', category);
      fd.append('source', source.trim());
      fd.append('email', email.trim());
      fd.append('ownership', 'true');

      const res = await fetch('/api/v1/submissions', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'فشل الإرسال');
      setTrackingId(body.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* الزر العائم */}
      <button className="fab" onClick={() => setOpen(true)} aria-label="أرسل رياكشن">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        <span>أرسل رياكشن</span>
      </button>

      {open && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="modal-box">
            <h3>عندك رياكشن يمني يستاهل؟ أرسله لنا</h3>

            {trackingId ? (
              <div className="success-box">
                <div className="success-mark">✓</div>
                <p>وصلت مساهمتك وهي قيد المراجعة.</p>
                <p className="tracking mono">رقم التتبع: <strong>{trackingId}</strong></p>
                <p className="hint">احفظ الرقم — يمكنك متابعة الحالة به. وإذا سجّلت دخولًا تظهر مساهماتك في صفحة حسابك.</p>
                <button className="btn-primary" onClick={close}>تمام</button>
              </div>
            ) : (
              <form onSubmit={submit} className="submit-form">
                <label className="field">
                  <span>الفيديو <em>*</em></span>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setFile(e.target.files[0] || null)} />
                </label>

                <label className="field">
                  <span>الموقف (لمّا... / اقتباس) <em>*</em></span>
                  <input className="text-input" maxlength="120" placeholder="مثال: لما صاحبك يقول بكرة أسددلك"
                    value={situation} onInput={(e) => setSituation(e.target.value)} />
                </label>
                <div className="tpl-row">
                  {SEED_SITUATIONS.map((s) => (
                    <button type="button" key={s} className="tpl" onClick={() => setSituation(s)}>{s}</button>
                  ))}
                </div>

                <label className="field">
                  <span>كابشن مقترح (اختياري)</span>
                  <input className="text-input" maxlength="40" placeholder="مثال: برضه؟"
                    value={caption} onInput={(e) => setCaption(e.target.value)} />
                </label>

                <label className="field">
                  <span>التصنيف (اختياري)</span>
                  <select className="select-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">— اختر —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>

                <label className="field">
                  <span>المصدر (اختياري)</span>
                  <input className="text-input" maxlength="300" placeholder="من أين القصّة؟ (رابط/حساب)"
                    value={source} onInput={(e) => setSource(e.target.value)} />
                </label>

                <label className="field">
                  <span>بريدك (اختياري — لإشعارك بحالة المساهمة)</span>
                  <input className="text-input" type="email" maxlength="200" placeholder="you@example.com"
                    value={email} onInput={(e) => setEmail(e.target.value)} />
                </label>

                <label className="checkbox">
                  <input type="checkbox" checked={ownership} onChange={(e) => setOwnership(e.target.checked)} />
                  <span>أُقرّ أن لديّ الحق في إرسال هذا الفيديو، وأمنح يمن رياكت ترخيص استخدامه في المكتبة.</span>
                </label>

                {error && <p className="form-error">{error}</p>}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={close}>إلغاء</button>
                  <button type="submit" className="btn-primary" disabled={sending}>
                    {sending ? 'جاري الإرسال...' : 'أرسل'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
