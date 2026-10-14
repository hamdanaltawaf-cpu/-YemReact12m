#!/usr/bin/env bash
# ============================================================
# YemReact — استعادة من نسخة احتياطية
# ============================================================
# الاستخدام:
#   ./scripts/restore.sh data/backups/db-20260817-030000.sql.gz
#   RESTORE_MEDIA=1 ./scripts/restore.sh ...   # لاستعادة الوسائط أيضًا
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "الاستخدام: $0 <ملف-النسخة-الاحتياطية.sql.gz>"
  exit 1
fi

DB_DUMP="$1"
if [ ! -f "$DB_DUMP" ]; then
  echo "❌ الملف غير موجود: $DB_DUMP"
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-postgres://yemreact:yemreact_dev@127.0.0.1:5432/yemreact}"

echo "=== استعادة قاعدة البيانات من $DB_DUMP ==="
gunzip -c "$DB_DUMP" | psql "$DATABASE_URL"
echo "✓ استُعيدت قاعدة البيانات"

# استعادة الوسائط (اختياري) — يبحث عن أرشيف بنفس الطابع الزمني
if [ "${RESTORE_MEDIA:-0}" = "1" ]; then
  STAMP="$(basename "$DB_DUMP" | sed -E 's/^db-(.*)\.sql\.gz$/\1/')"
  MEDIA_ARCHIVE="$(dirname "$DB_DUMP")/media-$STAMP.tar.gz"
  MEDIA_DIR="${STORAGE_LOCAL_DIR:-data/media}"
  if [ -f "$MEDIA_ARCHIVE" ]; then
    echo "=== استعادة الوسائط ==="
    mkdir -p "$(dirname "$MEDIA_DIR")"
    rm -rf "$MEDIA_DIR"
    tar -xzf "$MEDIA_ARCHIVE" -C "$(dirname "$MEDIA_DIR")"
    echo "✓ استُعيدت الوسائط"
  else
    echo "ℹ️ لا أرشيف وسائط مطابق ($MEDIA_ARCHIVE) — تخطي"
  fi
fi

echo "=== اكتملت الاستعادة ==="
