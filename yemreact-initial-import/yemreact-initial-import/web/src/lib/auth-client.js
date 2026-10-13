// ============================================================
// مساعد المصادقة للعميل — جلب المستخدم الحالي + حفظ متزامن
// ============================================================

// يجلب المستخدم الحالي (null إذا لم يسجّل دخولًا)
export async function currentUser() {
  try {
    const res = await fetch('/api/v1/auth/me');
    if (!res.ok) return null;
    const { user } = await res.json();
    return user;
  } catch {
    return null;
  }
}

// محفوظات الضيف المحلية (localStorage)
export function loadGuestSaved() {
  try { return JSON.parse(localStorage.getItem('yr_saved') || '[]'); }
  catch { return []; }
}

export function persistGuestSaved(ids) {
  try { localStorage.setItem('yr_saved', JSON.stringify(ids)); } catch {}
}

// ترحيل محفوظات الضيف إلى الحساب بعد الدخول — يعيد القائمة المدمجة
export async function migrateGuestSaved() {
  const guest = loadGuestSaved();
  if (!guest.length) return [];
  const res = await fetch('/api/v1/me/saved/migrate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reactionIds: guest }),
  });
  if (!res.ok) return [];
  const { merged } = await res.json();
  persistGuestSaved(merged || []);
  return merged || [];
}

// حفظ/إزالة رياكشن — يكتب للخادم إذا كان مسجلًا، وللضيف محليًا دائمًا
export async function toggleSave(reactionId, isSaved, isLoggedIn) {
  // دائمًا نحدّث المحلي (يعمل للضيف والمسجل كذاكرة عرض فورية)
  const guest = loadGuestSaved();
  const next = isSaved ? guest.filter((id) => id !== reactionId) : [...guest, reactionId];
  persistGuestSaved(next);

  // إذا كان مسجلًا، نزامن مع الخادم
  if (isLoggedIn) {
    try {
      await fetch('/api/v1/me/saved', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reactionId, saved: !isSaved }),
      });
    } catch { /* الخادم سيُزامن عند الدخول */ }
  }
  return next;
}
