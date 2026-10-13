// ============================================================
// واجهة التخزين (قابلة للتبديل)
// ============================================================
// اليوم: تنفيذ قرص محلي (LocalStorage).
// لاحقًا: تنفيذ Cloudflare R2 / AWS S3 خلف نفس الواجهة دون لمس الكود.
// (المبدأ المعماري #9: كل خدمة خارجية خلف interface واحد).

import fs from 'node:fs';
import path from 'node:path';

// العقد: put(key, buffer, contentType) · get(key) · url(key) · delete(key) · exists(key)
export class StorageInterface {
  async put() { throw new Error('Not implemented'); }
  async get() { throw new Error('Not implemented'); }
  url() { throw new Error('Not implemented'); }
  async delete() { throw new Error('Not implemented'); }
  async exists() { throw new Error('Not implemented'); }
}

// تنفيذ القرص المحلي
export class LocalStorage extends StorageInterface {
  constructor({ rootDir, publicBaseUrl = '/media' }) {
    super();
    this.rootDir = rootDir;
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  #resolve(key) {
    // حماية ضد path traversal
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.rootDir, safe);
  }

  async put(key, buffer, _contentType) {
    const target = this.#resolve(key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    return key;
  }

  async get(key) {
    const target = this.#resolve(key);
    return fs.existsSync(target) ? fs.readFileSync(target) : null;
  }

  url(key) {
    return key ? `${this.publicBaseUrl}/${key}` : null;
  }

  async delete(key) {
    const target = this.#resolve(key);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }

  async exists(key) {
    return fs.existsSync(this.#resolve(key));
  }
}

// مصنع: يبني التنفيذ المناسب حسب الإعدادات
export function createStorage(storageConfig) {
  switch (storageConfig.transport) {
    case 'local':
      return new LocalStorage({
        rootDir: storageConfig.localDir,
        publicBaseUrl: storageConfig.publicBaseUrl,
      });
    case 's3':
      // يُنفَّذ في مرحلة لاحقة (R2/S3)
      throw new Error('تخزين S3/R2 غير مفعّل بعد — استخدم transport=local');
    default:
      throw new Error(`ناقل تخزين غير معروف: ${storageConfig.transport}`);
  }
}
