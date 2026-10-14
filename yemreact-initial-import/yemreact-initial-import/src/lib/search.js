// أدوات بناء نص البحث المطبَّع
import { normalizeArabic } from './arabic.js';

// يبني نص بحث موحّدًا من حقول الرياكشن (يُخزَّن في search_text ويُقارن معه)
// searchOptimizer: نص موسّع اختياري يكتبه المحرر لتحسين البحث باللهجة اليمنية
// (كلمات مفتاحية ومرادفات تتجاوز الكابشن/الموقف — مسترد من نسخة Manus).
export function buildSearchText({ caption, situation, description, keywords, searchOptimizer }) {
  return normalizeArabic(
    [caption, situation, description, ...(keywords || []), searchOptimizer].filter(Boolean).join(' ')
  );
}
