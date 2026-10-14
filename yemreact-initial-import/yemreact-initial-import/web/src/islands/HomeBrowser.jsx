// ============================================================
// جزيرة الصفحة الرئيسية — الاكتشاف والبحث والفلترة
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { clientGet, trackEvent } from '../lib/api.js';
import { categories } from '../lib/tokens.js';
import { SEED_PHRASES } from '../lib/constants.js';
import { currentUser, loadGuestSaved, toggleSave } from '../lib/auth-client.js';
import { ClipFrame, SaveButton } from '../components/ui.jsx';

const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

function loadSaved() {
  return new Set(loadGuestSaved());
}

export default function HomeBrowser() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [newest, setNewest] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(loadSaved);
  const [loggedIn, setLoggedIn] = useState(false);
  const debounceRef = useRef(null);

  // كشف حالة الدخول
  useEffect(() => {
    currentUser().then((u) => { if (u) setLoggedIn(true); });
  }, []);

  // الجلب الأول: مختار + مجموعات + قائمة كاملة
  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [feat, colls, list] = await Promise.all([
        clientGet('/featured'),
        clientGet('/collections'),
        clientGet('/reactions?limit=100'),
      ]);
      setFeatured(feat.featured);
      setNewest(feat.newest || []);
      setCollections(colls.collections || []);
      setReactions(list.reactions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // البحث/الفلترة (طلب مُنقَّض 200ms)
  useEffect(() => {
    if (loading) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (activeCat) params.set('cat', activeCat);
        if (query.trim()) params.set('q', query.trim());
        params.set('limit', '100');
        const list = await clientGet(`/reactions?${params.toString()}`);
        setReactions(list.reactions || []);
      } catch { /* يبقى العرض السابق */ }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeCat, loading]);

  const toggleSave = useCallback(async (id) => {
    const wasSaved = saved.has(id);
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    await toggleSave(id, wasSaved, loggedIn);
    if (!wasSaved) trackEvent(id, 'save');
  }, [saved, loggedIn]);

  const open = (slug) => { window.location.href = `/r/${slug}`; };

  const shown = reactions;

  return (
    <div>
      {/* البحث بالموقف */}
      <div className="hero">
        <div className="search-box">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            className="search-input"
            placeholder="دوّر بالموقف اللي فيه... مثلاً: لما صاحبك يقول بكرة"
            value={query}
            onInput={(e) => setQuery(e.target.value)}
            aria-label="بحث عن رياكشن بالموقف"
          />
        </div>
        <div className="chip-row">
          {SEED_PHRASES.map((s) => (
            <button key={s} className="chip" onClick={() => setQuery(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* شريط التصنيفات */}
      <div className="cat-rail">
        <button
          className={`cat-pill ${!activeCat ? 'active' : ''}`}
          style={{ '--pc': 'var(--paper)' }}
          onClick={() => setActiveCat(null)}
        >الكل</button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`cat-pill ${activeCat === c.id ? 'active' : ''}`}
            style={{ '--pc': c.color }}
            onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
          >{c.name}</button>
        ))}
      </div>

      {loading && (
        <div>
          <div className="section"><div className="skeleton" style={{ height: '140px' }} /></div>
          <div className="grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '9/16' }} />
            ))}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="state-msg">
          تعذّر تحميل المكتبة. تحقق من اتصالك.
          <br /><button className="retry" onClick={loadAll}>إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && (
        <div>
          {/* مختار الأسبوع */}
          {featured && (
            <div className="section">
              <div className="section-head">
                <h2 className="section-title">مختار الأسبوع</h2>
              </div>
              <div className="featured-card">
                <div className="torn-lg" style={{ overflow: 'hidden' }}>
                  <ClipFrame reaction={featured} size="sm" />
                </div>
                <div>
                  <div className="f-quote">{featured.quote}</div>
                  <div className="f-situation">{featured.situation}</div>
                  <button className="f-cta" onClick={() => open(featured.slug)}>
                    شوفها <span className="ltr">←</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* المجموعات */}
          {collections.length > 0 && collections.some((c) => c.count > 0) && (
            <div className="section">
              <div className="section-head">
                <h2 className="section-title">مجموعات</h2>
              </div>
              {collections.map((c) => (
                <CollectionRow key={c.slug} collection={c} onOpen={open} />
              ))}
            </div>
          )}

          {/* جديد المكتبة */}
          {newest.length > 0 && !activeCat && !query.trim() && (
            <div className="section">
              <div className="section-head">
                <h2 className="section-title">جديد المكتبة</h2>
              </div>
              <div className="collection-row">
                {newest.slice(0, 8).map((r) => (
                  <MiniCard key={r.id} reaction={r} onOpen={open} />
                ))}
              </div>
            </div>
          )}

          {/* الشبكة الرئيسية */}
          <div className="section">
            <div className="section-head">
              <h2 className="section-title">
                {activeCat ? catById[activeCat]?.name || '' : query.trim() ? 'نتائج البحث' : 'المكتبة'}
              </h2>
              <span className="section-sub">{shown.length} رياكشن</span>
            </div>

            {shown.length === 0 ? (
              <div className="state-msg">
                مافي رياكشن يطابق... جرّب كلمة ثانية أو صفّي الفلتر.
              </div>
            ) : (
              <div className="grid">
                {shown.map((r) => (
                  <ReactionCard
                    key={r.id} reaction={r}
                    saved={saved.has(r.id)} onToggleSave={() => toggleSave(r.id)}
                    onOpen={() => open(r.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// صف مجموعة (يجلب رياكشناتها عند التمرير/العرض)
function CollectionRow({ collection, onOpen }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    clientGet(`/collections/${collection.slug}`)
      .then((d) => setItems(d.reactions || []))
      .catch(() => {});
  }, [collection.slug]);
  if (!items.length) return null;
  return (
    <div className="section" style={{ marginBottom: '20px' }}>
      <div className="section-head" style={{ marginBottom: '10px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{collection.title}</h3>
        <span className="section-sub">{items.length} رياكشن</span>
      </div>
      <div className="collection-row">
        {items.map((r) => (
          <MiniCard key={r.id} reaction={r} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function ReactionCard({ reaction, saved, onToggleSave, onOpen }) {
  const cat = catById[reaction.cat];
  return (
    <div className="card" onClick={onOpen}>
      <div className="torn-lg" style={{ overflow: 'hidden' }}>
        <ClipFrame reaction={reaction}>
          <div className="play-veil">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--paper)">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </ClipFrame>
      </div>
      <div className="card-meta">
        <div className="card-meta-top">
          <span className="cat-label" style={{ color: cat?.color || 'var(--paper)' }}>{cat?.name}</span>
          <SaveButton saved={saved} onToggle={onToggleSave} />
        </div>
        <div className="quote-line">{reaction.quote}</div>
      </div>
    </div>
  );
}

function MiniCard({ reaction, onOpen }) {
  const cat = catById[reaction.cat];
  return (
    <div className="mini-card" onClick={() => onOpen(reaction.slug)}>
      <ClipFrame reaction={reaction} size="sm" />
      <div className="mini-quote" style={{ color: cat?.color || 'var(--paper)' }}>{reaction.quote}</div>
    </div>
  );
}
