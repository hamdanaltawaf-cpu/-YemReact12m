#!/usr/bin/env bash
# ============================================================
# YemReact — نسخ احتياطي يومي (PostgreSQL + الوسائط)
# ============================================================
# الاستخدام:
#   ./scripts/backup.sh                # يحفظ في data/backups/
#   BACKUP_DIR=/path ./scripts/backup.sh
# يُنصح بجدولته يوميًا عبر cron:
#   0 3 * * * cd /path/to/yemreact && ./scripts/backup.sh >> data/backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-data/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# قاعدة البيانات (من DATABASE_URL أو الافتراضي المحلي)
DATABASE_URL="${DATABASE_URL:-postgres://yemreact:yemreact_dev@127.0.0.1:5432/yemreact}"

echo "=== نسخ احتياطي $STAMP ==="

# 1) قاعدة البيانات
DB_DUMP="$BACKUP_DIR/db-$STAMP.sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$DB_DUMP"
echo "✓ قاعدة البيانات: $DB_DUMP ($(du -h "$DB_DUMP" | cut -f1))"

# 2) الوسائط (إن وُجدت)
MEDIA_DIR="${STORAGE_LOCAL_DIR:-data/media}"
if [ -d "$MEDIA_DIR" ]; then
  MEDIA_ARCHIVE="$BACKUP_DIR/media-$STAMP.tar.gz"
  tar -czf "$MEDIA_ARCHIVE" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"
  echo "✓ الوسائط: $MEDIA_ARCHIVE ($(du -h "$MEDIA_ARCHIVE" | cut -f1))"
fi

# 3) تنظيف النسخ القديمة (احتفظ بآخر 14 نسخة)
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/media-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "=== اكتمل النسخ الاحتياطي ==="
