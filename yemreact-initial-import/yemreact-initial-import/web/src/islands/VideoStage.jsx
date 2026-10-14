// جزيرة المرحلة: الفيديو (ضمنيًا صامتًا، نقرة للصوت، إعادة تلقائية) + تسجيل المشاهدة
import { useState, useEffect } from 'preact/hooks';
import { trackEvent } from '../lib/api.js';
import { QusasaMark } from '../components/ui.jsx';

export default function VideoStage({ reaction }) {
  const [muted, setMuted] = useState(true);

  // تسجيل المشاهدة عند الفتح (الخادم يمنع تكرارها للجلسة نفسها)
  useEffect(() => {
    trackEvent(reaction.id, 'view');
  }, [reaction.id]);

  return (
    <div className="detail-stage torn-lg">
      {reaction.video ? (
        <video
          src={reaction.video}
          muted={muted}
          autoplay
          loop
          playsinline
          preload="metadata"
          poster={reaction.thumb || undefined}
        />
      ) : (
        <div className="card-placeholder" style={{ width: '100%', height: '100%' }}>
          <QusasaMark size={64} fill="rgba(243,234,224,.45)" />
        </div>
      )}
      {reaction.video && (
        <button className="sound-toggle" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}>
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
          )}
        </button>
      )}
    </div>
  );
}
