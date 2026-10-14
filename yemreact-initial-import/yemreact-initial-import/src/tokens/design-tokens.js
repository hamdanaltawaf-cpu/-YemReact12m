// ============================================================
// YemReact — Design Tokens v1.0 (المصدر الوحيد للحقيقة البصرية)
// ============================================================
// هذه الوحدة هي الترجمة الحرفية البرمجية لملف:
//   YemReact-Brand-v1.0-LOCKED.html
// لا يجوز تعديل أي قيمة هنا إلا بقرار توثّق في docs/DECISIONS.md.
// كل ما في الواجهة (P3) والوسائط (P2) يُشتق من هذه التوكنز فقط.

// ---------- الألوان الأساسية (مقفلة) ----------
export const colors = {
  ink: '#121214',         // حبر داكن — الخلفية الأساسية
  ink2: '#1a1a1d',        // حبر ثانوي — الأسطح
  ink3: '#232327',        // حبر ثالث — مراحل/صناديق
  amber: '#c1592e',       // كهرمان القشر — اللون الأساسي (شعار/أزرار)
  amberLight: '#e0824b',  // كهرمان فاتح — نصوص/روابط على خلفية داكنة
  paper: '#f3eae0',       // ورق البخور — النص الأساسي
  paperDim: '#c9bfb4',    // ورق خافت
  coral: '#ff5a36',       // مرجان الرياكشن — تأكيد/طاقة (بحذر)
  grey: '#6b625c',        // رمادي دافئ — حدود وفواصل فقط (ليس نصًا)
  greyLight: '#9c9289',   // رمادي فاتح — نص ثانوي/وصفي
};

// ---------- ألوان التصنيف التسع (مقفلة — النسخة المصحّحة) ----------
// ملاحظة: رفض = #6e8296 و حماس = #e8712e (قيم v1.0 المعتمدة، ليست قيم الدليل المبكر)
export const categoryColors = {
  laugh: '#f4c430',       // ضحك
  shock: '#7c5cff',       // صدمة
  anger: '#c81e3a',       // ضابح (غضب) — الاسم المعتمد "ضابح" (قرار التوحيد)
  surprise: '#2cb6c4',    // استغراب / انبهار (عائلة لونية واحدة، لا لون عاشر)
  embarrass: '#f17fb2',   // إحراج / صمت
  approve: '#4caf6d',     // موافقة
  reject: '#6e8296',      // رفض
  sarcasm: '#d98e04',     // سخرية
  hype: '#e8712e',        // حماس
};

// ---------- الخطوط (مقفلة) ----------
export const fonts = {
  displayAr: "'Lalezar', sans-serif",      // العناوين العربية (≤ ٥ كلمات فقط)
  bodyAr: "'Cairo', sans-serif",           // النصوص
  displayEn: "'Archivo Black', sans-serif", // العناوين الإنجليزية
  bodyEn: "'Inter', sans-serif",           // النصوص الإنجليزية
  mono: "'IBM Plex Mono', monospace",      // المواصفات والأرقام
};

// ---------- قائمة التصنيفات (مصدر واحد للبذر والواجهة) ----------
export const categories = [
  { id: 'laugh', name: 'ضحك', color: categoryColors.laugh },
  { id: 'shock', name: 'صدمة', color: categoryColors.shock },
  { id: 'anger', name: 'ضابح', color: categoryColors.anger },
  { id: 'surprise', name: 'استغراب', color: categoryColors.surprise },
  { id: 'embarrass', name: 'إحراج/صمت', color: categoryColors.embarrass },
  { id: 'approve', name: 'موافقة', color: categoryColors.approve },
  { id: 'reject', name: 'رفض', color: categoryColors.reject },
  { id: 'sarcasm', name: 'سخرية', color: categoryColors.sarcasm },
  { id: 'hype', name: 'حماس', color: categoryColors.hype },
];

// ---------- علامة القُصاصة (Qusasa Mark) ----------
// الإطار الممزق الزاوية + ثقب التشغيل المثلث (fill-rule: evenodd) — مقفل حرفيًا.
export const qusasaPath =
  'M10,0 L86,0 L92,6 L98,1 L104,7 L110,3 L120,14 L120,106 L106,120 L14,120 L0,106 L0,10 Z M46,38 L46,82 L82,60 Z';

// يُرجع سطر SVG كامل للعلامة (أحادي اللون أو مخطط).
export function qusasaSvg({ size = 24, fill = colors.amber, outline = false, className = '' } = {}) {
  const stroke = outline ? ` stroke="${fill}" stroke-width="7"` : '';
  const fillAttr = outline ? 'fill="none"' : `fill="${fill}"`;
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="display:block"><path ${fillAttr}${stroke} fill-rule="evenodd" d="${qusasaPath}"/></svg>`;
}

// ---------- قالب الكليب (Reaction Clip) — مقفل ----------
export const clip = {
  // حجم الواترمارك: تقشّر 9–15% من عرض الإطار (القيمة الوسيطة للتنفيذ الآلي)
  peelMinPct: 9,
  peelMaxPct: 15,
  peelDefaultPct: 12,
  cornerDefault: 'tr',   // أعلى يمين (الوضع الافتراضي)
  cornerMirrored: 'tl',  // أعلى يسار (عند "قلب الكتلة")
  // الظل المزدوج المعتمد لتقوية الواترمارك على أي خلفية (TIER 3 — مقفل)
  watermarkShadow:
    'drop-shadow(0 1px 2px rgba(0,0,0,.6)) drop-shadow(0 0 2px rgba(0,0,0,.4))',
  // مناطق الأمان (نسب مئوية من الإطار 9:16)
  safeArea916: { top: 6, bottom: 20, right: 14, left: 6 },
  safeArea11: { top: 8, bottom: 8, right: 8, left: 8 },
};

// ---------- الحافة الممزقة (تستخدم في البطاقات، لا في الفيديو المُصدَّر) ----------
export const tornClipPath = {
  lg: 'polygon(0% 6%, 6% 0%, 78% 0%, 83% 5%, 88% 1%, 93% 6%, 97% 2%, 100% 11%, 100% 94%, 94% 100%, 6% 100%, 0% 94%)',
  sm: 'polygon(0% 9%, 9% 0%, 76% 0%, 85% 7%, 100% 15%, 100% 92%, 92% 100%, 8% 100%, 0% 92%)',
};

// ---------- إخراج التوكنز كمتغيرات CSS (للواجهة في P3) ----------
export function cssVariables() {
  const vars = { ...colors, ...categoryColors };
  let out = ':root {\n';
  for (const [k, v] of Object.entries(vars)) {
    out += `  --${k}: ${v};\n`;
  }
  out += `  --f-display-ar: ${fonts.displayAr};\n`;
  out += `  --f-body-ar: ${fonts.bodyAr};\n`;
  out += `  --f-display-en: ${fonts.displayEn};\n`;
  out += `  --f-body-en: ${fonts.bodyEn};\n`;
  out += `  --f-mono: ${fonts.mono};\n`;
  out += '}\n';
  return out;
}

// ---------- الشعار اللفظي والشعار النصي ----------
export const brand = {
  nameAr: 'يمن رياكت',
  nameEn: 'YemReact',
  tagline: 'خذها. حطها. يمنية.',
};
