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
rpc() { # token json-body function
  curl -s -X POST "$SB/rest/v1/rpc/$1" -H "apikey: $ANON" -H "Authorization: Bearer $2" -H "Content-Type: application/json" -d "$3"
}

MODID=$(mkuser mod-smoke@example.com Mod | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
BADID=$(mkuser bad-smoke@example.com Bad | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "mod=$MODID bad=$BADID"
# promote mod to moderator via service role (direct update)
curl -s -o /dev/null -w "promote mod -> %{http_code}\n" -X PATCH "$SB/rest/v1/profiles?user_id=eq.$MODID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" -d '{"role":"moderator"}'

MT=$(token mod-smoke@example.com)
BT=$(token bad-smoke@example.com)

echo "=== Bad user posts a marker ==="
MK=$(curl -s -X POST "$SB/rest/v1/markers" -H "apikey: $ANON" -H "Authorization: Bearer $BT" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"author_id\":\"$BADID\",\"lat\":2.0,\"lng\":2.0,\"category\":\"other\",\"text\":\"admin smoke marker\",\"expires_at\":\"2030-01-01T00:00:00Z\"}")
MKID=$(echo "$MK" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if isinstance(d,list) and d else '')")
echo "marker=$MKID"

echo "=== Mod files a report via submit_report RPC ==="
rpc submit_report "$MT" "{\"p_target_type\":\"marker\",\"p_target_id\":\"$MKID\",\"p_reason\":\"spam test\"}"; echo
echo "=== duplicate report (should say duplicate) ==="
rpc submit_report "$MT" "{\"p_target_type\":\"marker\",\"p_target_id\":\"$MKID\",\"p_reason\":\"spam test\"}"; echo

echo "=== Bad user (not staff) tries admin_list_reports (should error/forbidden) ==="
rpc admin_list_reports "$BT" "{\"p_status\":\"open\"}"; echo
echo "=== Mod lists reports (should return the report) ==="
rpc admin_list_reports "$MT" "{\"p_status\":\"open\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print('count',len(d) if isinstance(d,list) else d)"

echo "=== Mod deletes marker via admin_delete_marker ==="
rpc admin_delete_marker "$MT" "{\"p_marker_id\":\"$MKID\"}"; echo
echo "=== verify marker gone ==="
curl -s "$SB/rest/v1/markers?id=eq.$MKID&select=id" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"; echo

echo "=== Mod bans bad user ==="
rpc admin_set_ban "$MT" "{\"p_user_id\":\"$BADID\",\"p_banned\":true}"; echo
echo "=== banned user cannot post marker (RLS should deny) ==="
curl -s -o /dev/null -w "banned marker -> %{http_code}\n" -X POST "$SB/rest/v1/markers" -H "apikey: $ANON" -H "Authorization: Bearer $BT" -H "Content-Type: application/json" \
  -d "{\"author_id\":\"$BADID\",\"lat\":2.0,\"lng\":2.0,\"category\":\"other\",\"text\":\"should fail\",\"expires_at\":\"2030-01-01T00:00:00Z\"}"

echo "=== Mod (not admin) tries admin_set_role (should be forbidden) ==="
rpc admin_set_role "$MT" "{\"p_user_id\":\"$BADID\",\"p_role\":\"moderator\"}"; echo

echo "=== rate limit: 6 quick markers by mod, 6th should be blocked at app layer (DB check_rate_limit) ==="
for i in 1 2 3 4 5 6; do
  echo -n "call $i: "; rpc check_rate_limit "$MT" "{\"p_action\":\"rl_test\",\"p_max\":5,\"p_window_seconds\":60}"; echo
done

echo "=== CLEANUP ==="
curl -s -o /dev/null -w "del markers -> %{http_code}\n" -X DELETE "$SB/rest/v1/markers?text=like.admin%25" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
curl -s -o /dev/null -w "del mod -> %{http_code}\n" -X DELETE "$SB/auth/v1/admin/users/$MODID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
curl -s -o /dev/null -w "del bad -> %{http_code}\n" -X DELETE "$SB/auth/v1/admin/users/$BADID" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
