#!/usr/bin/env bash
# بناء الواجهة العامة (SSG) — يتطلب الـ API شغّالًا للبناء
set -euo pipefail
cd "$(dirname "$0")/.."

if ! curl -sf http://localhost:4173/health >/dev/null 2>&1; then
  echo "⚠️ الـ API غير شغّال على 4173 — ابدأه أولًا: npm run db:setup && npm start"
  exit 1
fi

cd web
npm install
PUBLIC_API_BASE="${PUBLIC_API_BASE:-http://localhost:4173}" npm run build
echo "✅ بُنيت الواجهة في web/dist"
