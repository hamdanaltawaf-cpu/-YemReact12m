// ============================================================
// بيانات البذر — الرياكشنات الأولية + المحتوى المسترد من نسخة Manus
// ============================================================
// - الفئات التسع (مع "ضابح" اسمًا معتمدًا لفئة anger) والرياكشنات الاثني عشر.
// - YR-0020 "مالك دخل": المحتوى الحقيقي الوحيد المسترد من الإنتاج (metadata فقط،
//   الفيديو بقي على manus-storage ولم يُنقل — يُعرض "لا فيديو" حتى يُرفع).
// - حقل searchOptimizer: نص موسّع للبحث باللهجة (مسترد من الإنتاج حيث وُجد).
// ملاحظة: المدة والزاوية من نموذج الواجهة؛ الفيديوهات الحقيقية تُرفع عبر P2.

export const seedReactions = [
  {
    displayId: 'YR-0001', cat: 'shock', caption: 'يا ساتر!',
    situation: 'لما تسمع خبر صادم', duration: 2, corner: 'tr',
    keywords: ['خبر', 'مفاجأة', 'صدمة', 'ما توقعت'],
  },
  {
    displayId: 'YR-0002', cat: 'reject', caption: 'عاد شي عقل؟',
    situation: 'لما حد يقولك كلام مالوش داعي', duration: 3, corner: 'tl',
    keywords: ['كلام زائد', 'غير منطقي', 'هراء', 'مالوش داعي'],
  },
  {
    displayId: 'YR-0003', cat: 'sarcasm', caption: 'قوية... قوية جدًا',
    situation: 'لما حد يسولف عليك', duration: 5, corner: 'tr',
    keywords: ['سوالف', 'كذب', 'مبالغة', 'استهزاء', 'يسولف'],
  },
  {
    displayId: 'YR-0004', cat: 'hype', caption: 'قوية!',
    situation: 'لما فريقك يسجل هدف', duration: 3, corner: 'tl',
    keywords: ['هدف', 'فوز', 'فريق', 'تشجيع', 'مباراة'],
  },
  {
    displayId: 'YR-0005', cat: 'surprise', caption: 'صلّي على النبي',
    situation: 'لما تشوف شي ما تصدق عيونك', duration: 4, corner: 'tr',
    keywords: ['مستحيل', 'ما أصدق', 'انبهار', 'عجيب', 'عيونك'],
  },
  {
    displayId: 'YR-0006', cat: 'laugh', caption: 'ياخي وربي',
    situation: 'لما صاحبك يقع بموقف محرج', duration: 3, corner: 'tr',
    keywords: ['محرج', 'موقف', 'ضحك', 'فشيلة', 'يقع'],
  },
  {
    displayId: 'YR-0007', cat: 'embarrass', caption: '…',
    situation: 'لما ما تلقى رد على كلامك', duration: 4, corner: 'tr',
    keywords: ['سكوت', 'صمت', 'محرج', 'ما في رد', 'حاضر'],
  },
  {
    displayId: 'YR-0008', cat: 'reject', caption: 'برضه؟',
    situation: 'لما صاحبك يقول بكرة أسددلك', duration: 3, corner: 'tr',
    keywords: ['دَين', 'مماطلة', 'بكرة', 'أسددلك', 'سداد'],
  },
  {
    displayId: 'YR-0009', cat: 'approve', caption: 'معك حق',
    situation: 'لما حد يقنعك بفكرة', duration: 2, corner: 'tr',
    keywords: ['اقتناع', 'صح', 'كلام مقنع', 'معك حق', 'فكرة'],
  },
  {
    displayId: 'YR-0010', cat: 'anger', caption: 'كفاية!',
    situation: 'لما حد يضيّع وقتك', duration: 3, corner: 'tr',
    keywords: ['تضييع وقت', 'عصبية', 'كفاية', 'زهقت', 'قرف'],
  },
  {
    displayId: 'YR-0011', cat: 'laugh', caption: 'بس بس بس',
    situation: 'لما واحد يمزح وما يوقف', duration: 3, corner: 'tr',
    keywords: ['مزح', 'هزار', 'يوقف', 'ضحك متواصل', 'بس'],
  },
  {
    displayId: 'YR-0012', cat: 'hype', caption: 'يووه!',
    situation: 'لما تسمع خبر مفرحك', duration: 2, corner: 'tr',
    keywords: ['خبر مفرح', 'فرحة', 'يووه', 'مبروك', 'إنجاز'],
  },
  // --- المحتوى المسترد من نسخة Manus (حقيقي، ليس اختبارًا) ---
  {
    displayId: 'YR-0020', cat: 'anger', caption: 'مالك دخل',
    situation: 'مالك دخل', duration: 3, corner: 'tr',
    keywords: ['مالك دخل', 'مصطفى المومري', 'المومري', 'مصطفى'],
    searchOptimizer: 'مالك دخل مالك دخل مصطفى المومري #المومري #مصطفى',
    source: 'المساهم', rightsStatus: 'original_submission',
  },
];

// المجموعات البذرية (المجموعات الأصلية + مجموعة "مصطفى المومري" المستردة)
export const seedCollections = [
  { slug: 'students', title: 'رياكشنات الطلاب', description: 'مواقف الجامعة والمذاكرة والأساتذة', color: '#2cb6c4' },
  { slug: 'group-chat', title: 'ردود القروبات', description: 'لما القروب يشتعل ويحتاج الرد المناسب', color: '#f4c430' },
  { slug: 'no-context', title: 'بلا سياق', description: 'لقطات تفهمها من نفسها بدون أي شرح', color: '#7c5cff' },
  { slug: 'mustafa-al-momari', title: 'مصطفى المومري', description: 'مصطفى المومري — بنك الرياكشنات اليمني', color: '#c81e3a' },
];

// عضوية المجموعات البذرية (معرّفات العرض)
export const seedCollectionItems = {
  students: ['YR-0009', 'YR-0010', 'YR-0003'],
  'group-chat': ['YR-0002', 'YR-0008', 'YR-0011'],
  'no-context': ['YR-0007', 'YR-0005', 'YR-0001'],
  'mustafa-al-momari': ['YR-0020'],
};

// الإعدادات الابتدائية
export const seedSettings = {
  site_name: 'يمن رياكت',
  new_count: '8',
  featured_reaction: 'YR-0001',
};
