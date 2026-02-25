#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3001}"
node apps/api/src/server.js >/tmp/crosstalk-api.log 2>&1 &
PID=$!
cleanup() { kill "$PID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

sleep 1

start=$(curl -sS -X POST "http://127.0.0.1:${PORT}/sessions/start" \
  -H 'content-type: application/json' \
  -d '{"userId":"pat","targetLanguage":"pt-BR"}')

sid=$(printf '%s' "$start" | sed -n 's/.*"sessionId":"\([^"]*\)".*/\1/p')
[ -n "$sid" ] || { echo "start failed: $start"; exit 1; }

turn=$(curl -sS -X POST "http://127.0.0.1:${PORT}/sessions/${sid}/turn" \
  -H 'content-type: application/json' \
  -d '{"userInput":"não entendi","inputMode":"text"}')

printf '%s' "$turn" | grep -q '"repairMode":true' || { echo "turn failed: $turn"; exit 1; }

end=$(curl -sS -X POST "http://127.0.0.1:${PORT}/sessions/end" \
  -H 'content-type: application/json' \
  -d '{"sessionId":"'"$sid"'"}')

printf '%s' "$end" | grep -q '"summary"' || { echo "end summary missing: $end"; exit 1; }
printf '%s' "$end" | grep -q '"exposureSummary"' || { echo "end exposure missing: $end"; exit 1; }

echo "E2E smoke OK"
