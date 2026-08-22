#!/usr/bin/env bash
# Применяет один SQL-файл к базе Supabase через Management API.
# Использование: scripts/apply-migration.sh supabase/migrations/<файл>.sql
# Требует переменные из .env.local: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$ROOT/.env.local" ]; then
  set -a; . "$ROOT/.env.local"; set +a
fi

FILE="${1:?путь к .sql файлу обязателен}"
: "${SUPABASE_ACCESS_TOKEN:?нет SUPABASE_ACCESS_TOKEN}"
: "${SUPABASE_PROJECT_REF:?нет SUPABASE_PROJECT_REF}"

QUERY="$(cat "$FILE")"
BODY="$(QUERY="$QUERY" python3 -c 'import json,os;print(json.dumps({"query":os.environ["QUERY"]}))')"

HTTP=$(curl -s -o /tmp/mig_resp.json -w "%{http_code}" \
  -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "$BODY")

echo "HTTP $HTTP"
cat /tmp/mig_resp.json
echo
[ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]
