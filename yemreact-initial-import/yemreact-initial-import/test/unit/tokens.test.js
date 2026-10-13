// اختبارات التوكنز المرجعية (P0) — تضمن أن القيم مطابقة للنسخة المقفلة
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  colors, categoryColors, categories, fonts, qusasaPath, clip, tornClipPath, brand,
} from '../../src/tokens/design-tokens.js';

test('الألوان الأساسية مطابقة لـ Brand v1.0 LOCKED', () => {
  assert.equal(colors.ink, '#121214');
  assert.equal(colors.amber, '#c1592e');
  assert.equal(colors.amberLight, '#e0824b');
  assert.equal(colors.paper, '#f3eae0');
  assert.equal(colors.coral, '#ff5a36');
  assert.equal(colors.grey, '#6b625c');
  assert.equal(colors.greyLight, '#9c9289');
});

test('ألوان التصنيف التسع مطابقة (بالقيم المصحّحة)', () => {
  assert.equal(categoryColors.laugh, '#f4c430');
  assert.equal(categoryColors.shock, '#7c5cff');
  assert.equal(categoryColors.anger, '#c81e3a');
  assert.equal(categoryColors.surprise, '#2cb6c4');
  assert.equal(categoryColors.embarrass, '#f17fb2');
  assert.equal(categoryColors.approve, '#4caf6d');
  assert.equal(categoryColors.reject, '#6e8296'); // القيمة المعتمدة (ليست #5C6B7A القديمة)
  assert.equal(categoryColors.sarcasm, '#d98e04');
  assert.equal(categoryColors.hype, '#e8712e');   // القيمة المعتمدة (ليست #E06A34 القديمة)
});

test('قائمة التصنيفات = 9 فئات بالترتيب', () => {
  assert.equal(categories.length, 9);
  assert.deepEqual(categories.map((c) => c.id), [
    'laugh', 'shock', 'anger', 'surprise', 'embarrass',
    'approve', 'reject', 'sarcasm', 'hype',
  ]);
});

test('الواترمارك ضمن النطاق المقفل 9–15%', () => {
  assert.ok(clip.peelMinPct >= 9 && clip.peelMinPct <= 15);
  assert.ok(clip.peelMaxPct >= 9 && clip.peelMaxPct <= 15);
  assert.ok(clip.peelDefaultPct >= 9 && clip.peelDefaultPct <= 15);
});

test('مساحة الأمان 9:16 مطابقة للمواصفة', () => {
  assert.deepEqual(clip.safeArea916, { top: 6, bottom: 20, right: 14, left: 6 });
});

test('علامة القُصاصة تحمل مسار SVG المعتمد', () => {
  assert.ok(qusasaPath.includes('M10,0 L86,0'));
  assert.ok(qusasaPath.includes('M46,38 L46,82 L82,60')); // ثقب التشغيل
});

test('الحافة الممزقة معرفة للبطاقات (لا للفيديو)', () => {
  assert.ok(tornClipPath.lg.startsWith('polygon'));
  assert.ok(tornClipPath.sm.startsWith('polygon'));
});

test('الخطوط والشعار اللفظي', () => {
  assert.ok(fonts.displayAr.includes('Lalezar'));
  assert.ok(fonts.bodyAr.includes('Cairo'));
  assert.equal(brand.nameAr, 'يمن رياكت');
  assert.equal(brand.tagline, 'خذها. حطها. يمنية.');
});
