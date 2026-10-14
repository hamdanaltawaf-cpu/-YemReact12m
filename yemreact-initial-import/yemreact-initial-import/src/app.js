// ============================================================
// بناء تطبيق Fastify (يُستخدم من الخادم ومن التجارب)
// ============================================================
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { errorHandler } from './lib/errors.js';
import { originCheckHook, securityHeaders } from './lib/security.js';
import { createStorage } from './interfaces/storage.js';
import { createMail } from './interfaces/mail.js';
import { createMedia } from './interfaces/media.js';
import { ensureWatermarks } from './lib/watermark.js';

import { categoriesRepo } from './repositories/categories.js';
import { reactionsRepo } from './repositories/reactions.js';
import { usersRepo, authCodesRepo } from './repositories/users.js';
import { savedRepo } from './repositories/saved.js';
import { eventsRepo } from './repositories/events.js';
import { settingsRepo, auditRepo } from './repositories/settings.js';
import { collectionsRepo } from './repositories/collections.js';
import { submissionsRepo } from './repositories/submissions.js';
import { reportsRepo } from './repositories/reports.js';
import { failedSearchesRepo } from './repositories/failed-searches.js';
import { adminService } from './services/admin.service.js';
import { authService } from './services/auth.service.js';
import { rebuildService } from './services/rebuild.service.js';
import { submissionsService } from './services/submissions.service.js';
import { mediaService } from './services/media.service.js';

import healthRoutes from './routes/health.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import adminReactionsRoutes from './routes/admin-reactions.js';
import adminSubmissionsRoutes from './routes/admin-submissions.js';
import adminContentRoutes from './routes/admin-content.js';
import mediaRoutes from './routes/media.js';
import eventsRoutes from './routes/events.js';
import discoveryRoutes from './routes/discovery.js';
import submissionsRoutes from './routes/submissions.js';
import reportsRoutes from './routes/reports.js';
import staticRoutes from './routes/static.js';

// بناء التطبيق مع حقن التبعيات (pool/config قابلة للتبديل في التجارب)
export async function buildApp({ pool, config, logger = true } = {}) {
  const app = Fastify({ logger, trustProxy: true });

  // ضخ الإعدادات والتبعيات
  app.decorate('pool', pool);
  app.decorate('config', config);

  app.decorate('storage', createStorage(config.storage));
  app.decorate('mail', createMail(config.mail, app.log));
  app.decorate('media', createMedia(config.media));

  // توليد ملفات الواترمارك (قُصاصة) عند الإقلاع إن لم تكن موجودة — قبل الخدمات
  const watermarkPaths = await ensureWatermarks({
    ffmpegPath: config.media.ffmpegPath,
    assetsDir: config.assets.dir,
  });
  app.decorate('watermarks', watermarkPaths);

  app.decorate('repos', {
    categories: categoriesRepo(pool),
    reactions: reactionsRepo(pool),
    users: usersRepo(pool),
    authCodes: authCodesRepo(pool),
    saved: savedRepo(pool),
    events: eventsRepo(pool),
    settings: settingsRepo(pool),
    audit: auditRepo(pool),
    collections: collectionsRepo(pool),
    submissions: submissionsRepo(pool),
    reports: reportsRepo(pool),
    failedSearches: failedSearchesRepo(pool),
  });

  // خدمة مصادقة المسؤول (تُشاركها مسارات الأحداث لاستثناء نشاط المسؤول)
  app.decorate('adminAuth', adminService({ config }));

  // خدمة مصادقة المستخدم (تُشاركها مسارات المساهمات لتحديد هوية المساهم)
  app.decorate('authService', authService({
    users: usersRepo(pool),
    authCodes: authCodesRepo(pool),
    mail: app.mail,
    config,
    logger: app.log,
  }));

  // خدمة إعادة البناء (تُستخدم بعد النشر/التعديل لتحديث صفحات SSG)
  app.decorate('rebuild', rebuildService({ config, logger: app.log }));

  // خدمة المساهمات (قبول/رفض + شارة موثوق) — مشتركة بين الإدارة والحساب
  app.decorate('submissionsService', submissionsService({
    submissions: submissionsRepo(pool),
    reactions: reactionsRepo(pool),
    media: mediaService({ media: app.media, storage: app.storage, reactions: reactionsRepo(pool), config }),
    storage: app.storage,
    config,
    watermarks: app.watermarks,
    mail: app.mail,
    users: usersRepo(pool),
  }));

  // الإضافات
  await app.register(cookie);
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: '1 minute',
  });
  await app.register(multipart, {
    limits: { fileSize: config.media.maxUploadBytes, files: 1 },
  });

  // حماية CSRF (Origin check) على الطلبات المؤذية
  originCheckHook(app);
  // رؤوس الأمان + CSP
  securityHeaders(app);

  // معالج الأخطاء الموحّد
  app.setErrorHandler(errorHandler);

  // المسارات
  await app.register(healthRoutes);
  await app.register(publicRoutes);
  await app.register(authRoutes);
  await app.register(adminRoutes);
  await app.register(adminReactionsRoutes);
  await app.register(adminSubmissionsRoutes);
  await app.register(adminContentRoutes);
  await app.register(mediaRoutes);
  await app.register(eventsRoutes);
  await app.register(discoveryRoutes);
  await app.register(submissionsRoutes);
  await app.register(reportsRoutes);
  await app.register(staticRoutes); // آخرًا: يلتقط كل ما لم يُطابَق

  return app;
}
