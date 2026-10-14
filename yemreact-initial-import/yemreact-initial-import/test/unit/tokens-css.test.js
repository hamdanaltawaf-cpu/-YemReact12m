// حارس التوافق البصري: يضمن أن web/src/styles/tokens.css مولّد من design-tokens.js
// (يمنع انحراف الواجهة عن الهوية المقفلة)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cssVariables, qusasaPath } from '../../src/tokens/design-tokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensCssPath = path.join(__dirname, '..', '..', 'web', 'src', 'styles', 'tokens.css');
const adminTokensCssPath = path.join(__dirname, '..', '..', 'web', 'public', 'admin', 'tokens.css');
const adminBrandJsPath = path.join(__dirname, '..', '..', 'web', 'public', 'admin', 'brand.js');

test('tokens.css مطابق لمخرجات design-tokens.js (لا انحراف بصري)', () => {
  if (!fs.existsSync(tokensCssPath)) return;
  const onDisk = fs.readFileSync(tokensCssPath, 'utf8');
  const expected = '/* ملف مولّد تلقائيًا من design-tokens.js — لا تُعدّله يدويًا */\n' + cssVariables();
  assert.equal(onDisk, expected, 'tokens.css منحرف — أعد توليده: npm --prefix web run gen:tokens');
});

test('نسخة لوحة الإدارة (tokens.css + brand.js) مطابقة للمصدر', () => {
  if (!fs.existsSync(adminTokensCssPath)) return;
  const onDisk = fs.readFileSync(adminTokensCssPath, 'utf8');
  const expected = '/* ملف مولّد تلقائيًا من design-tokens.js — لا تُعدّله يدويًا */\n' + cssVariables();
  assert.equal(onDisk, expected, 'admin/tokens.css منحرف');

  // مسار علامة القُصاصة (الهوية المقفلة) يجب أن يظهر حرفيًا في brand.js
  const brandJs = fs.readFileSync(adminBrandJsPath, 'utf8');
  assert.ok(brandJs.includes(qusasaPath), 'brand.js لا يحتوي مسار القُصاصة المعتمد');
});
