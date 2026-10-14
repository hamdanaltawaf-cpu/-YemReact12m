# ============================================================
# YemReact — صورة الخادم
# ============================================================
# أساس Debian (Node 22 LTS) + ffmpeg من مستودعات Debian
# (يضمن توفر libx264 + aac + libwebp المطلوبة للمعالجة).
# ملفات الواترمارك (القُصاصة) مُضمّنة في src/assets — لا حاجة librsvg وقت التشغيل.
FROM node:22-bookworm-slim

# ffmpeg/ffprobe لمعالجة الوسائط (ترميز، واترمارك، مصغّرات WebP)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# تثبيت التبعيات (إنتاج فقط)
COPY package*.json ./
RUN npm ci --omit=dev

# نسخ الكود المصدري (يشمل src/assets/watermark*.png)
COPY src ./src

# الواجهة العامة المبنية (SSG) — تُبنى قبل بناء الصورة لأن بناءها يتطلب
# الـ API والبيانات حية:  cd web && npm install && npm run build
COPY web/dist ./web/dist

ENV NODE_ENV=production
EXPOSE 4173

# تشغيل الخادم (يهجّر ويبذر ويولّد الواترمارك تلقائيًا عند الإقلاع)
CMD ["node", "src/server.js"]
