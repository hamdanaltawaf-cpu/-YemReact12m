// يولد web/src/styles/tokens.css من src/tokens/design-tokens.js (المصدر الوحيد)
// يضمن أن الواجهة لا تنحرف عن الهوية المقفلة. يُشغَّل: npm --prefix web run gen:tokens
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cssVariables, colors, categoryColors, categories, qusasaPath } from '../../src/tokens/design-tokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'src', 'styles', 'tokens.css');
// نسخة لوحة الإدارة (تخدم SPA من web/public/admin)
const adminOutPath = path.join(__dirname, '..', 'public', 'admin', 'tokens.css');
const brandOutPath = path.join(__dirname, '..', 'public', 'admin', 'brand.js');

const header = '/* ملف مولّد تلقائيًا من design-tokens.js — لا تُعدّله يدويًا */\n';
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(adminOutPath), { recursive: true });
const css = header + cssVariables();
fs.writeFileSync(outPath, css);
fs.writeFileSync(adminOutPath, css);

// وحدة ES للمتصفح (تُستخدم داخل لوحة الإدارة — لأن public/ لا تُعالَج بواسطة Astro)
const brandJs = `// ملف مولّد تلقائيًا من design-tokens.js — لا تُعدّله يدويًا
export const colors = ${JSON.stringify(colors, null, 2)};
export const categoryColors = ${JSON.stringify(categoryColors, null, 2)};
export const categories = ${JSON.stringify(categories, null, 2)};
export const qusasaPath = ${JSON.stringify(qusasaPath)};
export function qusasaSvg({ size = 24, fill = colors.amber } = {}) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="display:block"><path fill="' + fill + '" fill-rule="evenodd" d="' + qusasaPath + '"/></svg>';
}
`;
fs.writeFileSync(brandOutPath, brandJs);

console.log('✅ وُلّد tokens.css + brand.js (للواجهة + للوحة الإدارة) من design-tokens.js');
