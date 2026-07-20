#!/usr/bin/env bash
# wave13-20 — aggregate wave gate: suites, webpack build + sw.js, drift zero, bake, audit, offline E2E.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s db:seed >/dev/null 2>&1 || { echo "FAIL: db:seed"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }

grep -qE '"build": *"next build --webpack"' package.json || { echo "FAIL: build script not on the webpack path"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
[ -f public/sw.js ] || { echo "FAIL: public/sw.js missing after build"; exit 1; }
sz="$(wc -c < public/sw.js | tr -d ' ')"
[ "$sz" -gt 10240 ] || { echo "FAIL: public/sw.js too small ($sz)"; exit 1; }

drift="$(npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script 2>/dev/null || true)"
echo "$drift" | grep -qiE 'empty migration' || { echo "FAIL: schema drift detected (expected none this wave):"; echo "$drift" | head -10; exit 1; }
m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9 (frozen at plan time — no schema change this wave)"; exit 1; }

n="$(find public/img-cache -maxdepth 1 -name '*-540.avif' 2>/dev/null | wc -l | tr -d ' ')"
[ "${n:-0}" -ge 1000 ] || { echo "FAIL: prebake incomplete ($n -540.avif variants)"; exit 1; }
big="$(find public/img-cache -name '*.avif' -size +122880c 2>/dev/null | wc -l | tr -d ' ')"
[ "${big:-0}" -eq 0 ] || { echo "FAIL: $big AVIF variants over the 120KB cap"; exit 1; }

# fresh server for the transport gates (stale-server/stale-chunk traps)
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1
nohup npm run start -- -H 0.0.0.0 -p 3100 >/tmp/w13-verify-server.log 2>&1 &
code="000"
for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3100/" || true)"
  [ "$code" != "000" ] && break
  sleep 1
done
[ "$code" != "000" ] || { echo "FAIL: server did not come up on :3100"; exit 1; }

npm run -s audit:browser || { echo "FAIL: browser audit"; exit 1; }

out="$(npm run -s e2e:offline 2>&1)" || { echo "FAIL: e2e:offline"; echo "$out" | tail -20; exit 1; }
sid="$(echo "$out" | grep -E '^E2E_SESSION_ID=' | head -1 | cut -d= -f2 | tr -d '[:space:]')"
[ -n "$sid" ] || { echo "FAIL: no E2E_SESSION_ID from e2e:offline"; exit 1; }
nlog="$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM ReviewLog WHERE testSessionId='$sid';")"
[ "$nlog" = "1" ] || { echo "FAIL: exactly-once violated (ReviewLog=$nlog for $sid)"; exit 1; }

# all prior wave13 journals done
bad=0
for j in tasks/wave13-*/journal.md; do
  case "$j" in *wave13-20-verify-wave13*) continue ;; esac
  grep -qE '^\*\*Status:\*\* done' "$j" || { echo "NOT DONE: $j"; bad=1; }
done
[ "$bad" -eq 0 ] || { echo "FAIL: wave13 tasks not all done"; exit 1; }
echo "PASS wave13-20"
