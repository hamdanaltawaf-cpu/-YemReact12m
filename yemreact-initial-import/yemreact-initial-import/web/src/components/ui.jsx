// ============================================================
// مكوّنات Preact المشتركة (مبنية على التوكنز المقفلة)
// ============================================================
import { qusasaPath, categoryColors } from '../lib/tokens.js';

// علامة القُصاصة (SVG)
export function QusasaMark({ size = 24, fill = 'var(--amber)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style="display:block">
      <path fill={fill} fill-rule="evenodd" d={qusasaPath} />
    </svg>
  );
}

// إطار الكليب (المصغّرة + عناصر قالب الكليب: تقشّر + مدة + نقطة تصنيف)
export function ClipFrame({ reaction, children, size = 'lg' }) {
  const catColor = categoryColors[reaction.cat] || 'var(--paper)';
  const corner = reaction.corner === 'tl' ? 'tl' : 'tr';
  const durSide = corner === 'tr' ? 'left' : 'right';
  const dotSide = corner === 'tr' ? 'left' : 'right';

  return (
    <div className={`card-thumb ${size === 'sm' ? '' : 'torn-lg'}`}>
      {reaction.thumb ? (
        <img src={reaction.thumb} alt={reaction.quote} loading="lazy" />
      ) : (
        <div className="card-placeholder">
          <QusasaMark size={36} fill="rgba(243,234,224,.5)" />
        </div>
      )}
      {/* تقشّر الواترمارك */}
      <div className={`peel ${corner}`}>
        <QusasaMark size={20} fill="var(--ink)" />
      </div>
      {/* تاغ المدة */}
      {reaction.dur > 0 && <div className={`dur-tag ${durSide} mono`}>{reaction.dur}s</div>}
      {/* نقطة التصنيف */}
      <div className={`cat-dot ${dotSide}`} style={{ background: catColor }} />
      {children}
    </div>
  );
}

// زر حفظ
export function SaveButton({ saved, onToggle }) {
  return (
    <button
      className="save-btn"
      aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ الرياكشن'}
      title={saved ? 'محفوظة' : 'احفظها'}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24"
        fill={saved ? 'var(--amberLight)' : 'none'}
        stroke={saved ? 'var(--amberLight)' : 'var(--greyLight)'}
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
