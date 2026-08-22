#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
set -a; . ./.env.local; set +a
SB="$NEXT_PUBLIC_SUPABASE_URL"; ANON="$NEXT_PUBLIC_SUPABASE_ANON_KEY"; SVC="$SUPABASE_SERVICE_ROLE_KEY"

mkuser() { curl -s -X POST "$SB/auth/v1/admin/users" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"Test123456!\",\"email_confirm\":true,\"user_metadata\":{\"display_name\":\"$2\",\"date_of_birth\":\"1990-01-01\"}}" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])"; }
tok() { curl -s -X POST "$SB/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"Test123456!\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])"; }

A=$(mkuser near-a@example.com AdultA); B=$(mkuser near-b@example.com AdultB); C=$(mkuser near-c@example.com MinorC)
echo "A=$A B=$B C=$C"
# A and B confirm 18+ and share; C stays non-adult
for U in "$A" "$B"; do
  curl -s -o /dev/null -w "confirm -> %{http_code}\n" -X PATCH "$SB/rest/v1/profiles?user_id=eq.$U" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" -d '{"age_verified_adult":true}'
done
TA=$(tok near-a@example.com); TB=$(tok near-b@example.com); TC=$(tok near-c@example.com)
curl -s -o /dev/null -w "A share -> %{http_code}\n" -X POST "$SB/rest/v1/live_locations" -H "apikey: $ANON" -H "Authorization: Bearer $TA" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d "{\"user_id\":\"$A\",\"lat\":55.75,\"lng\":37.61,\"sharing_enabled\":true}"
curl -s -o /dev/null -w "B share -> %{http_code}\n" -X POST "$SB/rest/v1/live_locations" -H "apikey: $ANON" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d "{\"user_id\":\"$B\",\"lat\":55.76,\"lng\":37.62,\"sharing_enabled\":true}"

echo "=== A (adult) sees shared locations (expect >=2: self + B) ==="
curl -s "$SB/rest/v1/live_locations?sharing_enabled=eq.true&select=user_id" -H "apikey: $ANON" -H "Authorization: Bearer $TA" | python3 -c "import sys,json;d=json.load(sys.stdin);print('rows',len(d) if isinstance(d,list) else d)"

echo "=== C (non-adult) sees only own row (expect 0 shared) ==="
curl -s "$SB/rest/v1/live_locations?sharing_enabled=eq.true&select=user_id" -H "apikey: $ANON" -H "Authorization: Bearer $TC" | python3 -c "import sys,json;d=json.load(sys.stdin);print('rows',len(d) if isinstance(d,list) else d)"

echo "=== B turns sharing OFF ==="
curl -s -o /dev/null -w "B off -> %{http_code}\n" -X PATCH "$SB/rest/v1/live_locations?user_id=eq.$B" -H "apikey: $ANON" -H "Authorization: Bearer $TB" -H "Content-Type: application/json" -d '{"sharing_enabled":false}'
echo "=== A sees only self now (expect 1) ==="
curl -s "$SB/rest/v1/live_locations?sharing_enabled=eq.true&select=user_id" -H "apikey: $ANON" -H "Authorization: Bearer $TA" | python3 -c "import sys,json;d=json.load(sys.stdin);print('rows',len(d) if isinstance(d,list) else d)"

echo "=== CLEANUP ==="
for U in "$A" "$B" "$C"; do curl -s -o /dev/null -w "del -> %{http_code}\n" -X DELETE "$SB/auth/v1/admin/users/$U" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"; done
