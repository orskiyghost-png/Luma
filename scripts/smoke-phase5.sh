#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
set -a; . ./.env.local; set +a

SB="$NEXT_PUBLIC_SUPABASE_URL"
ANON="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
SVC="$SUPABASE_SERVICE_ROLE_KEY"

mkuser() {
  curl -s -X POST "$SB/auth/v1/admin/users" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"Test123456!\",\"email_confirm\":true,\"user_metadata\":{\"display_name\":\"$2\"}}"
}
token() {
  curl -s -X POST "$SB/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"Test123456!\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])"
}

AID=$(mkuser alice-smoke@example.com Alice | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
BID=$(mkuser bob-smoke@example.com Bob | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "alice=$AID bob=$BID"
AT=$(token alice-smoke@example.com)
BT=$(token bob-smoke@example.com)
LOW=$(python3 -c "print(min('$AID','$BID'))")
HIGH=$(python3 -c "print(max('$AID','$BID'))")

echo "=== Alice starts conversation ==="
CONV=$(curl -s -X POST "$SB/rest/v1/conversations" -H "apikey: $ANON" -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"user_low\":\"$LOW\",\"user_high\":\"$HIGH\",\"initiator_id\":\"$AID\"}")
echo "$CONV"
CID=$(echo "$CONV" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if isinstance(d,list) and d else '')")
echo "conv=$CID"

echo "=== Alice first message (pending, allowed as initiator) ==="
curl -s -o /dev/null -w "alice msg -> %{http_code}\n" -X POST "$SB/rest/v1/messages" -H "apikey: $ANON" -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" -d "{\"conversation_id\":\"$CID\",\"sender_id\":\"$AID\",\"recipient_id\":\"$BID\",\"body\":\"Privet Bob\"}"

echo "=== Bob replies BEFORE accept (must be denied) ==="
curl -s -o /dev/null -w "bob premature -> %{http_code}\n" -X POST "$SB/rest/v1/messages" -H "apikey: $ANON" -H "Authorization: Bearer $BT" \
  -H "Content-Type: application/json" -d "{\"conversation_id\":\"$CID\",\"sender_id\":\"$BID\",\"recipient_id\":\"$AID\",\"body\":\"spam\"}"

echo "=== Bob accepts ==="
curl -s -o /dev/null -w "accept -> %{http_code}\n" -X PATCH "$SB/rest/v1/conversations?id=eq.$CID" -H "apikey: $ANON" -H "Authorization: Bearer $BT" \
  -H "Content-Type: application/json" -d '{"status":"accepted"}'

echo "=== Bob replies AFTER accept (must be 201) ==="
curl -s -o /dev/null -w "bob reply -> %{http_code}\n" -X POST "$SB/rest/v1/messages" -H "apikey: $ANON" -H "Authorization: Bearer $BT" \
  -H "Content-Type: application/json" -d "{\"conversation_id\":\"$CID\",\"sender_id\":\"$BID\",\"recipient_id\":\"$AID\",\"body\":\"Privet Alice\"}"

echo "=== public_profile_cards RPC (Alice reads Bob card) ==="
curl -s -X POST "$SB/rest/v1/rpc/public_profile_cards" -H "apikey: $ANON" -H "Authorization: Bearer $AT" \
  -H "Content-Type: application/json" -d "{\"ids\":[\"$BID\"]}"
echo

echo "=== reaction toggle by Alice on a marker ==="
MK=$(curl -s -X POST "$SB/rest/v1/markers" -H "apikey: $ANON" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"author_id\":\"$AID\",\"lat\":1.0,\"lng\":1.0,\"category\":\"other\",\"text\":\"react test\",\"expires_at\":\"2030-01-01T00:00:00Z\"}")
MKID=$(echo "$MK" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if isinstance(d,list) and d else '')")
curl -s -o /dev/null -w "reaction insert -> %{http_code}\n" -X POST "$SB/rest/v1/reactions" -H "apikey: $ANON" -H "Authorization: Bearer $BT" -H "Content-Type: application/json" \
  -d "{\"target_type\":\"marker\",\"target_id\":\"$MKID\",\"user_id\":\"$BID\",\"type\":\"👍\"}"

echo "=== CLEANUP ==="
curl -s -o /dev/null -w "del markers -> %{http_code}\n" -X DELETE "$SB/rest/v1/markers?text=eq.react%20test" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
curl -s -o /dev/null -w "del conv -> %{http_code}\n" -X DELETE "$SB/rest/v1/conversations?id=eq.$CID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
curl -s -o /dev/null -w "del alice -> %{http_code}\n" -X DELETE "$SB/auth/v1/admin/users/$AID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
curl -s -o /dev/null -w "del bob -> %{http_code}\n" -X DELETE "$SB/auth/v1/admin/users/$BID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
