#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
set -a; . ./.env.local; set +a
SB="$NEXT_PUBLIC_SUPABASE_URL"; ANON="$NEXT_PUBLIC_SUPABASE_ANON_KEY"; SVC="$SUPABASE_SERVICE_ROLE_KEY"

USERID=$(curl -s -X POST "$SB/auth/v1/admin/users" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" \
  -d '{"email":"adult-smoke@example.com","password":"Test123456!","email_confirm":true,"user_metadata":{"display_name":"Adult","date_of_birth":"1990-01-01"}}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
T=$(curl -s -X POST "$SB/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"adult-smoke@example.com","password":"Test123456!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
echo "user=$USERID"

echo "=== enable sharing BEFORE 18+ (should be denied 401/403) ==="
curl -s -o /dev/null -w "share pre -> %{http_code}\n" -X POST "$SB/rest/v1/live_locations" -H "apikey: $ANON" -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USERID\",\"lat\":1,\"lng\":1,\"sharing_enabled\":true}"

echo "=== confirm 18+ (raise age_verified_adult) ==="
curl -s -o /dev/null -w "confirm -> %{http_code}\n" -X PATCH "$SB/rest/v1/profiles?user_id=eq.$USERID" -H "apikey: $ANON" -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  -d '{"age_verified_adult":true}'

echo "=== try LOWER age_verified back to false (should be denied by RLS) ==="
curl -s -o /dev/null -w "downgrade -> %{http_code}\n" -X PATCH "$SB/rest/v1/profiles?user_id=eq.$USERID" -H "apikey: $ANON" -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  -d '{"age_verified_adult":false}'

echo "=== enable sharing AFTER 18+ (should be 201) ==="
curl -s -o /dev/null -w "share post -> %{http_code}\n" -X POST "$SB/rest/v1/live_locations" -H "apikey: $ANON" -H "Authorization: Bearer $T" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d "{\"user_id\":\"$USERID\",\"lat\":1,\"lng\":1,\"sharing_enabled\":true}"

echo "=== CLEANUP ==="
curl -s -o /dev/null -w "del user -> %{http_code}\n" -X DELETE "$SB/auth/v1/admin/users/$USERID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
