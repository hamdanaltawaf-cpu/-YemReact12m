// ============================================================
// عميل الـ API (جلب بيانات حقيقية — لا بيانات وهمية)
// ============================================================

// عنوان الـ API المطلق (للاستخدام وقت البناء في getStaticPaths)
export const API_BASE = import.meta.env.PUBLIC_API_BASE || 'http://localhost:4173';

// جلب JSON بمسؤولية (يرمي خطأ عند فشل الاستجابة)
export async function getJson(path, base = API_BASE) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    throw new Error(`فشل جلب ${path}: ${res.status}`);
  }
  return res.json();
}

// جلب من مسار نسبي (للاستخدام داخل الجزر وقت التشغيل — نفس الأصل)
export async function clientGet(path) {
  const res = await fetch(`/api/v1${path}`);
  if (!res.ok) throw new Error(`فشل جلب ${path}: ${res.status}`);
  return res.json();
}

// تسجيل حدث تفاعل حقيقي (مشاهدة/حفظ/تنزيل/مشاركة)
export function trackEvent(reactionId, type) {
  return fetch(`/api/v1/reactions/${reactionId}/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type }),
  }).catch(() => {
    /* إخفاء فشل الأحداث بصمت — لا يكسر تجربة المستخدم */
  });
}
