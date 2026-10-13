// جزيرة الأفعال: تنزيل/استخدام + حفظ + مشاركة (أحداث حقيقية)
import { useState, useEffect } from 'preact/hooks';
import { trackEvent } from '../lib/api.js';
import { currentUser, loadGuestSaved, toggleSave } from '../lib/auth-client.js';

export default function DetailActions({ reaction }) {
  const [saved, setSaved] = useState(() => loadGuestSaved().includes(reaction.id));
  const [loggedIn, setLoggedIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    currentUser().then((u) => {
      if (u) {
        setLoggedIn(true);
        // مزامنة الحالة مع الخادم (المصدر النهائي للمسجّل)
        fetch('/api/v1/me/saved').then((r) => r.json()).then(({ saved }) => {
          setSaved((saved || []).includes(reaction.id));
        }).catch(() => {});
      }
    });
  }, [reaction.id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const onSave = async () => {
    const next = !saved;
    setSaved(next);
    await toggleSave(reaction.id, saved, loggedIn);
    if (next) trackEvent(reaction.id, 'save');
    showToast(next ? 'محفوظة ✓' : 'أُزيلت من المحفوظات');
  };

  const onDownload = async () => {
    if (!reaction.video) return;
    trackEvent(reaction.id, 'download');
    try {
      const res = await fetch(reaction.video);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yemreact-${reaction.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(reaction.video, '_blank');
    }
  };

  const onShare = async () => {
    trackEvent(reaction.id, 'share');
    const url = window.location.href;
    const text = `${reaction.quote} — ${reaction.situation}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'يمن رياكت', text, url }); return; }
      catch { /* أُلغي أو غير مدعوم */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); showToast('نُسخ الرابط ✓');
      setTimeout(() => setCopied(false), 1800);
    } catch { showToast('تعذّر النسخ'); }
  };

  return (
    <div>
      <div className="action-row">
        {reaction.video ? (
          <button className="btn-primary" onClick={onDownload}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            استخدم / حمّل
          </button>
        ) : (
          <button className="btn-primary" disabled>الفيلم قريبًا</button>
        )}
        <button className="btn-secondary" onClick={onSave}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'var(--amberLight)' : 'none'} stroke={saved ? 'var(--amberLight)' : 'var(--paper)'} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          {saved ? 'محفوظة' : 'احفظها'}
        </button>
        <button className="btn-secondary" onClick={onShare}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          {copied ? 'نُسخ' : 'شارك'}
        </button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
