// ============================================================
// مسار تسجيل الأحداث (مشاهدات/حفظ/تنزيل/مشاركة)
// ============================================================
import { eventsService } from '../services/events.service.js';

export default async function eventsRoutes(app) {
  const service = eventsService({
    events: app.repos.events,
    config: app.config,
    adminAuth: app.adminAuth,
  });

  app.post('/api/v1/reactions/:id/event', async (request, reply) => {
    const type = request.body?.type;
    const row = await app.repos.reactions.byDisplayId(request.params.id);
    if (!row) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'الرياكشن غير موجود' } });
    }
    const result = await service.record({ request, reply, reaction: row, type });
    // البوتات: تُرفض 403 (لا نُحتسب زحفًا كتفاعل حقيقي)
    if (result.reason === 'bot') {
      return reply.code(403).send({ error: { code: 'BOT_BLOCKED', message: 'الطلبات الآلية لا تُحتسب' } });
    }
    return result;
  });
}
