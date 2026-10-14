// ============================================================
// جزيرة الحساب — دخول OTP + محفوظات متزامنة + مساهماتي
// ============================================================
import { useState, useEffect, useCallback } from 'preact/hooks';
import { currentUser, migrateGuestSaved } from '../lib/auth-client.js';

const STATUS_NAME = { pending: 'قيد المراجعة', approved: 'مقبولة', rejected: 'مرفوضة' };

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // الدخول (OTP)
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // email → code
  const [authError, setAuthError] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  // البيانات
  const [saved, setSaved] = useState([]);
  const [savedReactions, setSavedReactions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [trusted, setTrusted] = useState(false);

  const loadMe = useCallback(async () => {
    const me = await currentUser();
    setUser(me);
    if (me) {
      setTrusted(me.trusted || false);
      const [savedRes, subsRes] = await Promise.all([
        fetch('/api/v1/me/saved').then((r) => r.json()).catch(() => ({ saved: [] })),
        fetch('/api/v1/me/submissions').then((r) => r.json()).catch(() => ({ submissions: [] })),
      ]);
      setSaved(savedRes.saved || []);
      setSubmissions(subsRes.submissions || []);
      setTrusted(subsRes.trusted ?? me.trusted ?? false);
      // جلب تفاصيل الرياكشنات المحفوظة (للشبكة)
      if ((savedRes.saved || []).length) {
        const { reactions } = await fetch('/api/v1/reactions?limit=200').then((r) => r.json());
        const byId = Object.fromEntries(reactions.map((r) => [r.id, r]));
        setSavedReactions((savedRes.saved || []).map((id) => byId[id]).filter(Boolean));
      } else {
        setSavedReactions([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const requestCode = async (e) => {
    e.preventDefault();
    setAuthError(null); setAuthBusy(true);
    try {
      const res = await fetch('/api/v1/auth/request-code', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'تعذّر الإرسال');
      setStep('code');
      // في بيئة التطوير يظهر الرمز
      if (body.devCode) setAuthError(`(وضع التطوير) الرمز: ${body.devCode}`);
    } catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setAuthError(null); setAuthBusy(true);
    try {
      const res = await fetch('/api/v1/auth/verify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'رمز غير صحيح');
      // ترحيل محفوظات الضيف
      await migrateGuestSaved();
      await loadMe();
    } catch (err) { setAuthError(err.message); }
    finally { setAuthBusy(false); }
  };

  const logout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null); setSaved([]); setSavedReactions([]); setSubmissions([]);
    setStep('email'); setEmail(''); setCode('');
  };

  if (loading) {
    return <div className="state-msg"><div className="skeleton" style={{ height: 120, width: '100%' }} /></div>;
  }

  // ---- غير مسجّل: شاشة الدخول ----
  if (!user) {
    return (
      <div className="account-auth">
        <h2 class="section-title">حسابك</h2>
        <p class="hint">بدون كلمة مرور — نرسل لك رمزًا على بريدك.</p>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="auth-form">
            <input className="text-input" type="email" required placeholder="بريدك الإلكتروني"
              value={email} onInput={(e) => setEmail(e.target.value)} />
            <button className="btn-primary" type="submit" disabled={authBusy}>
              {authBusy ? 'جاري الإرسال...' : 'أرسل الرمز'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="auth-form">
            <p class="hint">أدخل الرمز المرسل إلى <strong>{email}</strong></p>
            <input className="text-input" inputMode="numeric" maxlength="6" required placeholder="الرمز (6 أرقام)"
              value={code} onInput={(e) => setCode(e.target.value)} />
            <button className="btn-primary" type="submit" disabled={authBusy}>
              {authBusy ? 'جارٍ التحقق...' : 'دخول'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setStep('email')}>تغيير البريد</button>
          </form>
        )}
        {authError && <p className="form-error">{authError}</p>}
      </div>
    );
  }

  // ---- مسجّل ----
  return (
    <div className="account">
      <div className="account-head">
        <div>
          <h2 class="section-title">مرحبًا</h2>
          <p className="account-email">{user.email} {trusted && <span className="badge-trusted">مساهِم موثوق ✓</span>}</p>
        </div>
        <button className="btn-secondary" onClick={logout}>خروج</button>
      </div>

      <div className="section">
        <h3 className="panel-title">محفوظاتي ({saved.length})</h3>
        {savedReactions.length ? (
          <div className="grid">
            {savedReactions.map((r) => (
              <a key={r.id} href={`/r/${r.slug}`} className="card">
                <div className="card-thumb torn-lg" style={{ overflow: 'hidden' }}>
                  {r.thumb ? <img src={r.thumb} alt={r.quote} loading="lazy" /> : <div className="card-placeholder" />}
                </div>
                <div className="card-meta">
                  <div className="quote-line">{r.quote}</div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="hint">ما زلت ما حفظت شي — دوّر بالموقف واحفظ اللي يعجبك.</p>
        )}
      </div>

      <div className="section">
        <h3 className="panel-title">مساهماتي ({submissions.length})</h3>
        {submissions.length ? (
          <div className="sub-list">
            {submissions.map((s) => (
              <div key={s.id} className="sub-card" style={{ gridTemplateColumns: '1fr auto' }}>
                <div>
                  <div className="sub-quote">{s.caption || s.situation}</div>
                  <div className="sub-meta">{s.situation}</div>
                  <div className="sub-meta mono">{s.id}</div>
                  {s.rejectReason && <div className="sub-meta" style={{ color: 'var(--coral)' }}>سبب الرفض: {s.rejectReason}</div>}
                </div>
                <span className={`status-badge status-${s.status}`}>{STATUS_NAME[s.status] || s.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="hint">ما أرسلت أي رياكشن بعد — عندك رياكشن يمني يستاهل؟ <a href="/#submit" style={{ color: 'var(--amberLight)' }}>أرسله لنا</a>.</p>
        )}
      </div>
    </div>
  );
}
