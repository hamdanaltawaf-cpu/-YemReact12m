// ============================================================
// واجهة البريد (قابلة للتبديل)
// ============================================================
// dev: يطبع في السجل ويرجع الرمز للعميل في غير الإنتاج (مجاني).
// resend: بريد معاملاتي حقيقي عبر Resend HTTP API (بلا اعتماديات إضافية).
// (أي مزود آخر — SendGrid/Postmark/SMTP — يُضاف كتنفيذ خلف نفس الواجهة)

export class MailInterface {
  async sendOtp() { throw new Error('Not implemented'); }
  async sendSubmissionStatus() { throw new Error('Not implemented'); }
}

// تنفيذ التطوير: يسجّل بدل الإرسال
export class DevMail extends MailInterface {
  constructor(logger) {
    super();
    this.logger = logger;
  }

  async sendOtp(email, code) {
    this.logger.info({ email }, `[DEV-MAIL] رمز الدخول لـ ${email}: ${code}`);
    return { delivered: false, devCode: code };
  }

  async sendSubmissionStatus(email, status) {
    this.logger.info({ email, status }, `[DEV-MAIL] حالة المساهمة لـ ${email}: ${status}`);
    return { delivered: false };
  }
}

// تنفيذ Resend (بريد حقيقي)
export class ResendMail extends MailInterface {
  constructor({ apiKey, from, logger }) {
    super();
    this.apiKey = apiKey;
    this.from = from;
    this.logger = logger;
  }

  async #send(to, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`فشل إرسال البريد (${res.status}): ${body.slice(0, 200)}`);
    }
    return { delivered: true };
  }

  async sendOtp(email, code) {
    const html = `
      <div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>يمن رياكت</h2>
        <p>رمز الدخول الخاص بك:</p>
        <div style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</div>
        <p style="color:#666">صالح لمدة 15 دقيقة. إذا لم تطلب هذا الرمز، تجاهل الرسالة.</p>
      </div>`;
    await this.#send(email, 'رمز الدخول إلى يمن رياكت', html);
    return { delivered: true };
  }

  async sendSubmissionStatus(email, status) {
    const map = {
      approved: { title: 'قُبلت مساهمتك 🎉', body: 'تم قبول رياكشنك ونشره في المكتبة. شكرًا لمشاركتك!' },
      rejected: { title: 'حول مساهمتك', body: 'تم مراجعة رياكشنك ولم يُنشر هذه المرة. شكرًا لك.' },
    };
    const info = map[status] || { title: 'حول مساهمتك', body: `الحالة: ${status}` };
    const html = `
      <div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>${info.title}</h2>
        <p>${info.body}</p>
        <p style="color:#666">— يمن رياكت · خذها. حطها. يمنية.</p>
      </div>`;
    await this.#send(email, `يمن رياكت — ${info.title}`, html);
    return { delivered: true };
  }
}

// مصنع
export function createMail(mailConfig, logger) {
  switch (mailConfig.transport) {
    case 'dev':
      return new DevMail(logger);
    case 'resend':
      if (!mailConfig.resendApiKey) {
        throw new Error('MAIL_TRANSPORT=resend يتطلب RESEND_API_KEY');
      }
      return new ResendMail({ apiKey: mailConfig.resendApiKey, from: mailConfig.from, logger });
    default:
      throw new Error(`ناقل بريد غير معروف: ${mailConfig.transport}`);
  }
}
