// ============================================================
// أدوات التشفير (HMAC / SHA-256 / مقارنة آمنة زمنيًا)
// ============================================================
import crypto from 'node:crypto';
import fs from 'node:fs';

// HMAC-SHA256 → سداسي عشري
export function hmac(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// SHA-256 → سداسي عشري
export function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

// مقارنة نصّين آمنة زمنيًا (ضد هجمات التوقيت)
export function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// توكن عشوائي آمن
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

// رمز OTP رقمي بطول محدد
export function randomOtp(length = 6) {
  const digits = crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
  return digits;
}

// تجزئة عنوان IP بملح — لا يُخزَّن IP خام (مبدأ الخصوصية)
export function hashIp(ip, salt) {
  return sha256(`${salt}:${ip}`).slice(0, 16);
}

// تجزئة محتوى ملف (تجزئة متدفقة — لا تحمّل الملف كاملًا في الذاكرة)
// يُستخدم لكشف تكرار الفيديوهات
export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
