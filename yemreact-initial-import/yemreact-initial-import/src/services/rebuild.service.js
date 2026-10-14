// ============================================================
// خدمة إعادة البناء (Rebuild) — لصفحات التفاصيل الثابتة (SSG)
// ============================================================
// عند نشر/تعديل/أرشفة رياكشن، تحتاج صفحة تفاصيله الثابتة ووسوم OG إعادة بناء.
// تُنفَّذ بشكل مُنقَّض (debounced) عبر تشغيل `npm --prefix web run build` في
// عملية فرعية. في الإنتاج داخل Docker قد لا تتوفر أدوات بناء الواجهة،
// فتفشل الخدمة بصمت مع تسجيل تحذير (راجع PROGRESS — القرار رقم 4 في P4).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const execFileP = promisify(execFile);

export const rebuildService = (deps) => {
  const { config, logger } = deps;
  let timer = null;
  let building = false;

  return {
    // جدولة إعادة بناء (تجميع الطلبات المتتالية في بناء واحد)
    schedule() {
      if (!config.rebuild.enabled) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.run(), config.rebuild.debounceMs);
    },

    // التنفيذ الفعلي
    async run() {
      if (building) return;
      // لا نبني إلا إذا توفرت أدوات الواجهة (بيئة تطوير/خادم بلا Docker)
      if (!fs.existsSync('web/node_modules')) {
        logger.warn('إعادة البناء متاحة فقط عند توفر أدوات الواجهة (web/node_modules) — تخطي.');
        return;
      }
      building = true;
      try {
        logger.info('إعادة بناء الواجهة (SSG)...');
        await execFileP('npm', ['--prefix', 'web', 'run', 'build'], {
          env: { ...process.env, PUBLIC_API_BASE: `http://127.0.0.1:${config.port}` },
          timeout: 120_000,
        });
        logger.info('✅ اكتمل بناء الواجهة');
      } catch (err) {
        logger.warn({ err: err.message }, 'فشل إعادة بناء الواجهة — سيُعاد عند النشر التالي');
      } finally {
        building = false;
      }
    },
  };
};
