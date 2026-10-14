// ============================================================
// YemReact — لوحة الإدارة (SPA, Vanilla JS)
// ============================================================
import { qusasaSvg } from './brand.js';

// ---------- مساعدو API ----------
async function api(path, opts = {}) {
  const res = await fetch(`/api/v1${path}`, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  if (res.status === 401 && !path.includes('/admin/login') && !path.includes('/admin/me')) {
    showLogin();
    throw new Error('unauthorized');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error?.message || `خطأ ${res.status}`);
  }
  return body;
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

// ---------- حالة التطبيق ----------
const state = {
  view: 'dashboard',
  categories: [],
  // reactions
  rPage: 1, rPageSize: 30, rTotal: 0,
  rSearch: '', rStatus: '', rCat: '',
  // submissions
  subStatus: 'pending', subList: [], subIndex: 0,
  selectedSubmissionId: null,
};

// قوالب الكابشن (لمّا...)
const CAPTION_TEMPLATES = [
  'لمّا صاحبك يقول بكرة',
  'لما حد يهرّجك بموقف',
  'لما تسمع خبر ما توقعته',
  'في القروب لما...',
  'لما تشوف شي ما تصدق عيونك',
  'لما ما تلقى رد على كلامك',
  'لما واحد يكذب عليك',
  'لما يتصل رقم غريب',
];

// ---------- علامة القُصاصة ----------
function renderMarks() {
  $('#top-mark').innerHTML = qusasaSvg({ size: 24, fill: '#c1592e' });
  $('#login-mark').innerHTML = qusasaSvg({ size: 44, fill: '#c1592e' });
}

// ---------- الدخول ----------
function showLogin() {
  $('#app').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
}
function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
}

async function tryLogin() {
  const password = $('#password').value;
  const errEl = $('#login-error');
  errEl.textContent = '';
  try {
    await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    $('#password').value = '';
    await boot();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function boot() {
  const me = await api('/admin/me');
  if (!me.authenticated) { showLogin(); return; }
  showApp();
  await loadCategories();
  switchView('dashboard');
}

// ---------- التبويبات ----------
function switchView(view) {
  state.view = view;
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${view}`).classList.remove('hidden');
  if (view === 'dashboard') loadDashboard();
  if (view === 'reactions') loadReactions();
  if (view === 'submissions') loadSubmissions();
  if (view === 'reports') loadReports();
  if (view === 'content') loadContent();
  if (view === 'audit') loadAudit();
}

// ---------- التصنيفات ----------
async function loadCategories() {
  const { categories } = await api('/categories');
  state.categories = categories;
  const opts = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  $('#r-cat').innerHTML = `<option value="">كل التصنيفات</option>` + opts;
  $('#f-cat').innerHTML = opts;
}

// ---------- نظرة عامة ----------
async function loadDashboard() {
  const s = await api('/admin/stats');
  const { totals, byStatus, byCategory, top, daily } = s;

  const cards = [
    { n: totals.views, l: 'مشاهدة', accent: true },
    { n: totals.saves, l: 'حفظ' },
    { n: totals.downloads, l: 'تنزيل' },
    { n: totals.shares, l: 'مشاركة' },
    { n: (byStatus.published || 0), l: 'منشور' },
    { n: (byStatus.draft || 0), l: 'مسودة' },
    { n: (byStatus.archived || 0), l: 'مؤرشف' },
  ];
  $('#stat-cards').innerHTML = cards.map((c) => `
    <div class="stat-card ${c.accent ? 'accent' : ''}">
      <div class="num">${fmtNum(c.n)}</div>
      <div class="lbl">${c.l}</div>
    </div>`).join('');

  // الرسم اليومي
  const maxDaily = Math.max(1, ...daily.map((d) => d.n));
  $('#daily-chart').innerHTML = daily.length
    ? daily.map((d) => `<div class="daily-bar" style="height:${(d.n / maxDaily * 100).toFixed(0)}%" title="${d.day}: ${d.n}"></div>`).join('')
    : '<p class="hint">لا مشاهدات بعد</p>';

  // الأكثر مشاهدة
  $('#top-list').innerHTML = top.length
    ? top.map((t) => `<li><span>${esc(t.caption)}</span><span class="t-id">${t.display_id}</span><span class="t-views">${fmtNum(t.views_count)}</span></li>`).join('')
    : '<li class="hint">لا بيانات</li>';

  // التصنيفات
  const maxCat = Math.max(1, ...byCategory.map((c) => c.views));
  $('#cat-bars').innerHTML = byCategory.map((c) => `
    <div class="bar-row">
      <span class="bar-label">${esc(c.name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(c.views / maxCat * 100).toFixed(0)}%"></div></div>
      <span class="bar-num">${c.count}</span>
    </div>`).join('');

  // الاستعلامات الفاشلة (تغذية الفهرس)
  api('/admin/failed-searches').then(({ failedSearches, total7d }) => {
    $('#fs-total').textContent = total7d ? `(آخر 7 أيام: ${total7d})` : '';
    $('#fs-list').innerHTML = failedSearches.length
      ? failedSearches.map((f) => `<li><span>${esc(f.query)}</span><span class="t-views">×${f.count}</span></li>`).join('')
      : '<li class="hint">لا استعلامات فاشلة ✓</li>';
  }).catch(() => { $('#fs-list').innerHTML = '<li class="hint">—</li>'; });
}

// ---------- الرياكشنات ----------
async function loadReactions() {
  const params = new URLSearchParams({ page: state.rPage, pageSize: state.rPageSize });
  if (state.rSearch) params.set('q', state.rSearch);
  if (state.rStatus) params.set('status', state.rStatus);
  if (state.rCat) params.set('cat', state.rCat);
  const { items, total, page, pageSize } = await api(`/admin/reactions?${params}`);
  state.rTotal = total;

  $('#r-list').innerHTML = items.length
    ? items.map((r) => `
      <div class="r-row" data-id="${r.id}">
        <div class="r-thumb">${r.thumb ? `<img src="${r.thumb}" loading="lazy" />` : ''}</div>
        <div class="r-info">
          <div class="r-quote">${esc(r.quote)}</div>
          <div class="r-situation">${esc(r.situation)}</div>
          <div class="r-id">${r.id} · ${r.dur}s</div>
        </div>
        <span class="status-badge status-${r.status}">${statusName(r.status)}</span>
        <div class="r-actions">
          ${r.status !== 'published' ? `<button class="btn-secondary btn-sm act-publish" data-id="${r.id}">نشر</button>` : ''}
          ${r.status !== 'draft' ? `<button class="btn-secondary btn-sm act-draft" data-id="${r.id}">مسودة</button>` : ''}
          ${r.status !== 'archived' ? `<button class="btn-secondary btn-sm act-archive" data-id="${r.id}">أرشفة</button>` : ''}
          <button class="btn-secondary btn-sm act-edit" data-id="${r.id}">تعديل</button>
        </div>
      </div>`).join('')
    : '<p class="hint">لا نتائج</p>';

  const pages = Math.max(1, Math.ceil(total / pageSize));
  $('#r-pager').innerHTML = `
    <button id="pg-prev" ${page <= 1 ? 'disabled' : ''}>→ السابق</button>
    <span class="pg">صفحة ${page} من ${pages} · ${total} رياكشن</span>
    <button id="pg-next" ${page >= pages ? 'disabled' : ''}>التالي ←</button>`;

  $('#pg-prev')?.addEventListener('click', () => { state.rPage--; loadReactions(); });
  $('#pg-next')?.addEventListener('click', () => { state.rPage++; loadReactions(); });

  bindReactionActions();
}

function bindReactionActions() {
  $$('.act-publish').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.id, 'published')));
  $$('.act-draft').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.id, 'draft')));
  $$('.act-archive').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.id, 'archived')));
  $$('.act-edit').forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.id)));
}

async function setStatus(id, status) {
  try {
    await api(`/admin/reactions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`تم: ${id} → ${statusName(status)}`);
    loadReactions();
  } catch (e) { toast(e.message, true); }
}

// فتح نافذة التعديل
async function openEdit(id) {
  const { reaction } = await api(`/admin/reactions/${id}`);
  $('#modal-reaction-title').textContent = `تعديل ${reaction.id}`;
  $('#f-file').disabled = true; $('#f-file').required = false;
  $('#f-cat').value = reaction.cat;
  $('#f-caption').value = reaction.quote;
  $('#f-situation').value = reaction.situation;
  $('#f-desc').value = reaction.desc || '';
  $('#f-keywords').value = (reaction.keywords || []).join('، ');
  $('#f-search-optimizer').value = reaction.searchOptimizer || '';
  $('#f-source').value = reaction.source || '';
  $('#f-corner').value = reaction.corner || 'tr';
  $('#modal-reaction').dataset.mode = 'edit';
  $('#modal-reaction').dataset.id = id;
  $('#modal-reaction').classList.remove('hidden');
}

// فتح نافذة الرفع
function openUpload() {
  $('#modal-reaction-title').textContent = 'رفع رياكشن جديد';
  $('#reaction-form').reset();
  $('#f-file').disabled = false; $('#f-file').required = true;
  $('#modal-reaction').dataset.mode = 'create';
  delete $('#modal-reaction').dataset.id;
  $('#modal-reaction').classList.remove('hidden');
}

// إرسال النموذج (رفع أو تعديل)
async function submitReaction(e) {
  e.preventDefault();
  const mode = $('#modal-reaction').dataset.mode;
  const submit = $('#reaction-submit');
  submit.disabled = true;

  try {
    if (mode === 'create') {
      const fd = new FormData();
      fd.append('file', $('#f-file').files[0]);
      fd.append('category', $('#f-cat').value);
      fd.append('caption', $('#f-caption').value);
      fd.append('situation', $('#f-situation').value);
      fd.append('description', $('#f-desc').value);
      fd.append('keywords', $('#f-keywords').value);
      fd.append('searchOptimizer', $('#f-search-optimizer').value);
      fd.append('source', $('#f-source').value);
      fd.append('corner', $('#f-corner').value);
      const res = await fetch('/api/v1/admin/reactions', { method: 'POST', credentials: 'same-origin', body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'فشل الرفع');
      toast(`نُشر ${body.reaction.id} ✓`);
    } else {
      const id = $('#modal-reaction').dataset.id;
      await api(`/admin/reactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          categoryId: $('#f-cat').value,
          caption: $('#f-caption').value,
          situation: $('#f-situation').value,
          description: $('#f-desc').value,
          keywords: $('#f-keywords').value.split(/[,،]/).map((k) => k.trim()).filter(Boolean),
          searchOptimizer: $('#f-search-optimizer').value,
          source: $('#f-source').value,
          corner: $('#f-corner').value,
        }),
      });
      toast(`حُدّث ${id} ✓`);
    }
    $('#modal-reaction').classList.add('hidden');
    loadReactions();
  } catch (err) {
    toast(err.message, true);
  } finally {
    submit.disabled = false;
  }
}

// ---------- المساهمات ----------
async function loadSubmissions() {
  const { submissions } = await api(`/admin/submissions?status=${state.subStatus}`);
  state.subList = submissions;
  state.subIndex = Math.min(state.subIndex, submissions.length - 1);
  state.selectedSubmissionId = submissions[state.subIndex]?.id || null;

  $('#sub-list').innerHTML = submissions.length
    ? submissions.map((s, i) => `
      <div class="sub-card ${i === state.subIndex ? 'selected' : ''}" data-id="${s.id}" data-idx="${i}">
        <div class="sub-video">${s.video ? `<video src="${s.video}" muted loop preload="metadata"></video>` : ''}</div>
        <div class="sub-body">
          <div class="sub-quote">${esc(s.caption || '—')}</div>
          <div class="sub-meta">${esc(s.situation || '')}</div>
          <div class="sub-meta">${s.id} · تصنيف: ${catName(s.categoryId)} ${s.rejectReason ? `· سبب الرفض: ${esc(s.rejectReason)}` : ''}</div>
        </div>
        <div class="sub-actions">
          ${s.status === 'pending' ? `
            <button class="btn-primary btn-sm act-approve" data-id="${s.id}">قبول ونشر <span class="kbd">A</span></button>
            <button class="btn-danger btn-sm act-reject" data-id="${s.id}">رفض <span class="kbd">R</span></button>` : ''}
          <span class="status-badge status-${s.status}">${statusName(s.status)}</span>
        </div>
      </div>`).join('')
    : '<p class="hint">لا مساهمات في هذه الحالة</p>';

  bindSubmissionActions();
  // معاينة الفيديو عند المرور
  $$('.sub-video video').forEach((v) => {
    v.addEventListener('mouseenter', () => v.play());
    v.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
  });
}

function bindSubmissionActions() {
  $$('.act-approve').forEach((b) => b.addEventListener('click', () => approveSubmission(b.dataset.id)));
  $$('.act-reject').forEach((b) => b.addEventListener('click', () => openReject(b.dataset.id)));
  // النقر على البطاقة يحددها (للاختصارات)
  $$('.sub-card').forEach((c) => c.addEventListener('click', () => {
    state.subIndex = Number(c.dataset.idx);
    loadSubmissions();
  }));
}

async function approveSubmission(id) {
  try {
    const { reaction } = await api(`/admin/submissions/${id}/approve`, { method: 'POST', body: JSON.stringify({}) });
    toast(`نُشرت ${reaction.id} ✓`);
    loadSubmissions();
  } catch (e) { toast(e.message, true); }
}

function openReject(id) {
  state.selectedSubmissionId = id;
  $('#reject-reason').value = '';
  $('#modal-reject').classList.remove('hidden');
}

async function confirmReject() {
  const reason = $('#reject-reason').value.trim();
  try {
    await api(`/admin/submissions/${state.selectedSubmissionId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    toast('رُفضت المساهمة');
    $('#modal-reject').classList.add('hidden');
    loadSubmissions();
  } catch (e) { toast(e.message, true); }
}

// ---------- المحتوى ----------
async function loadContent() {
  const [cats, cols, feat] = await Promise.all([
    api('/admin/categories'),
    api('/admin/collections'),
    api('/admin/featured'),
  ]);

  $('#cat-list').innerHTML = cats.categories.map((c) => `
    <div class="cat-item" data-id="${c.id}">
      <span class="cat-dot-sm" style="background:${c.color}"></span>
      <input class="text-input cat-name" value="${esc(c.name)}" style="flex:1" />
      <input class="text-input cat-desc" value="${esc(c.description || '')}" style="flex:1.4" placeholder="وصف" />
      <input class="text-input cat-order" value="${c.sort_order}" style="width:56px" type="number" />
      <button class="btn-secondary btn-sm cat-save" data-id="${c.id}">حفظ</button>
    </div>`).join('');

  $('#col-list').innerHTML = cols.collections.map((c) => `
    <div class="col-item" data-id="${c.id}">
      <div style="flex:1">
        <strong>${esc(c.title)}</strong> <span class="hint">(${c.slug} · ${c.count} رياكشن)</span>
      </div>
      <button class="btn-danger btn-sm col-del" data-id="${c.id}">حذف</button>
    </div>`).join('') || '<p class="hint">لا مجموعات</p>';

  $('#featured-input').value = feat.featured.join(', ');

  $$('.cat-save').forEach((b) => b.addEventListener('click', async () => {
    const row = b.closest('.cat-item');
    try {
      await api(`/admin/categories/${b.dataset.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: row.querySelector('.cat-name').value,
          description: row.querySelector('.cat-desc').value,
          sortOrder: Number(row.querySelector('.cat-order').value),
        }),
      });
      toast('حُفظ التصنيف');
    } catch (e) { toast(e.message, true); }
  }));

  $$('.col-del').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('حذف المجموعة نهائيًا؟')) return;
    try { await api(`/admin/collections/${b.dataset.id}`, { method: 'DELETE' }); toast('حُذفت المجموعة'); loadContent(); }
    catch (e) { toast(e.message, true); }
  }));
}

async function saveFeatured() {
  const ids = $('#featured-input').value.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  try {
    await api('/admin/featured', { method: 'POST', body: JSON.stringify({ reactionIds: ids }) });
    $('#featured-msg').textContent = '✓ حُفظ';
    toast('حُفظ مختار الأسبوع');
  } catch (e) { $('#featured-msg').textContent = e.message; toast(e.message, true); }
}

// ---------- البلاغات ----------
async function loadReports() {
  const { reports } = await api('/admin/reports');
  $('#report-list').innerHTML = reports.length
    ? reports.map((r) => `
      <div class="sub-card">
        <div class="sub-body">
          <div class="sub-quote">${esc(r.caption)} <span class="hint mono">(${r.display_id})</span></div>
          <div class="sub-meta">سبب البلاغ: ${esc(r.reason)}</div>
          ${r.reporter_email || r.reporter_contact ? `<div class="sub-meta">تواصل المبلّغ: ${esc(r.reporter_email || r.reporter_contact)}</div>` : ''}
          <div class="sub-meta mono">${new Date(r.created_at).toLocaleString('ar-YE', { hour12: false })}</div>
        </div>
        <div class="sub-actions">
          <button class="btn-primary btn-sm act-republish" data-id="${r.id}">إعادة نشر</button>
          <button class="btn-danger btn-sm act-remove" data-id="${r.id}">حذف نهائي</button>
        </div>
      </div>`).join('')
    : '<p class="hint">لا بلاغات مفتوحة ✓</p>';

  $$('.act-republish').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('إعادة نشر الرياكشن؟')) return;
    try { await api(`/admin/reports/${b.dataset.id}/republish`, { method: 'POST', body: JSON.stringify({}) }); toast('أُعيد النشر'); loadReports(); }
    catch (e) { toast(e.message, true); }
  }));
  $$('.act-remove').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('حذف الرياكشن نهائيًا؟ لا يمكن التراجع.')) return;
    try { await api(`/admin/reports/${b.dataset.id}/remove`, { method: 'POST', body: JSON.stringify({}) }); toast('حُذف نهائيًا'); loadReports(); }
    catch (e) { toast(e.message, true); }
  }));
}

// ---------- السجل ----------
async function loadAudit() {
  const { logs } = await api('/admin/audit?limit=200');
  $('#audit-table').innerHTML = `
    <tr><th>الوقت</th><th>الفاعل</th><th>الفعل</th><th>الهدف</th><th>ملخص</th></tr>` +
    logs.map((l) => `
      <tr>
        <td class="mono">${new Date(l.created_at).toLocaleString('ar-YE', { hour12: false })}</td>
        <td>${esc(l.actor)}</td>
        <td>${esc(l.action)}</td>
        <td class="mono">${esc(l.target || '')}</td>
        <td>${esc(l.summary || '')}</td>
      </tr>`).join('');
}

// ---------- أدوات ----------
function fmtNum(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
  return String(v);
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function catName(id) { return state.categories.find((c) => c.id === id)?.name || id || '—'; }
function statusName(s) {
  return { published: 'منشور', draft: 'مسودة', archived: 'مؤرشف', legal_review: 'قيد المراجعة القانونية', pending: 'قيد المراجعة', approved: 'مقبولة', rejected: 'مرفوضة' }[s] || s;
}
let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.style.background = isError ? 'var(--anger)' : 'var(--paper)';
  t.style.color = isError ? 'var(--paper)' : 'var(--ink)';
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// ---------- الاختصارات ----------
function onKeydown(e) {
  if (state.view !== 'submissions') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (state.subStatus !== 'pending' || !state.subList.length) return;
  const cur = state.subList[state.subIndex];
  if (!cur) return;
  if (e.key === 'a' || e.key === 'A' || e.key === 'ا') {
    e.preventDefault(); approveSubmission(cur.id);
  } else if (e.key === 'r' || e.key === 'R' || e.key === 'ق') {
    e.preventDefault(); openReject(cur.id);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault(); state.subIndex = (state.subIndex + 1) % state.subList.length; loadSubmissions();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault(); state.subIndex = (state.subIndex - 1 + state.subList.length) % state.subList.length; loadSubmissions();
  }
}

// ---------- ربط الأحداث ----------
function bindEvents() {
  $('#login-btn').addEventListener('click', tryLogin);
  $('#password').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
  $('#logout-btn').addEventListener('click', async () => { await api('/admin/logout', { method: 'POST' }); showLogin(); });

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

  // الفلاتر
  let searchTimer;
  $('#r-search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.rSearch = e.target.value; state.rPage = 1; loadReactions(); }, 250);
  });
  $('#r-status').addEventListener('change', (e) => { state.rStatus = e.target.value; state.rPage = 1; loadReactions(); });
  $('#r-cat').addEventListener('change', (e) => { state.rCat = e.target.value; state.rPage = 1; loadReactions(); });

  // الرفع/التعديل
  $('#open-upload').addEventListener('click', openUpload);
  $('#reaction-form').addEventListener('submit', submitReaction);

  // المساهمات
  $$('.sub-tab').forEach((t) => t.addEventListener('click', () => {
    $$('.sub-tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    state.subStatus = t.dataset.status; state.subIndex = 0; loadSubmissions();
  }));
  $('#reject-confirm').addEventListener('click', confirmReject);

  // المحتوى
  $('#save-featured').addEventListener('click', saveFeatured);
  $('#open-col-create').addEventListener('click', () => $('#modal-collection').classList.remove('hidden'));
  $('#collection-create').addEventListener('click', async () => {
    try {
      await api('/admin/collections', {
        method: 'POST',
        body: JSON.stringify({ slug: $('#c-slug').value, title: $('#c-title').value, description: $('#c-desc').value }),
      });
      toast('أُنشئت المجموعة');
      $('#modal-collection').classList.add('hidden');
      $('#c-slug').value = ''; $('#c-title').value = ''; $('#c-desc').value = '';
      loadContent();
    } catch (e) { toast(e.message, true); }
  });

  // إغلاق النوافذ
  $$('.modal [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('.modal').classList.add('hidden')));
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); }));

  document.addEventListener('keydown', onKeydown);

  // قوالب الكابشن
  const tplRow = $('#caption-tpls');
  tplRow.innerHTML = CAPTION_TEMPLATES.map((t) => `<button type="button" class="tpl" data-tpl="${esc(t)}">${esc(t)}</button>`).join('');
  $$('.tpl').forEach((b) => b.addEventListener('click', () => { $('#f-situation').value = b.dataset.tpl; }));
}

// ---------- البداية ----------
renderMarks();
bindEvents();
boot();
