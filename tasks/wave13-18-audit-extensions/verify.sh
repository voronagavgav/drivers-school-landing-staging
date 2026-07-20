#!/usr/bin/env bash
# wave13-18 — audit extensions present + full audit green against a fresh production server.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

A="bin/browser-audit.sh"
grep -qF "manifest.webmanifest" "$A" || { echo "FAIL: manifest assertion missing"; exit 1; }
grep -qF "~offline" "$A" || { echo "FAIL: offline-fallback assertion missing"; exit 1; }
grep -qF "Ви офлайн" "$A" || { echo "FAIL: offline copy assertion missing"; exit 1; }
grep -qF "image/avif" "$A" || { echo "FAIL: AVIF negotiation assertion missing"; exit 1; }
grep -qF "122880" "$A" || { echo "FAIL: 120KB body-size assertion missing"; exit 1; }
grep -qF "immutable" "$A" || { echo "FAIL: immutable cache-control assertion missing"; exit 1; }
grep -qF "prebake:images" "$A" || { echo "FAIL: missing-variant FAIL message must name the prebake fix"; exit 1; }
grep -qF "serviceWorker" "$A" || { echo "FAIL: best-effort SW check missing"; exit 1; }
grep -qE 'SKIP' "$A" || { echo "FAIL: SW check must SKIP (not FAIL) on insecure origin"; exit 1; }
# hygiene: no BRE plus-escapes in the new code
grep -qE "grep -v '\^\\\\\+" "$A" && { echo "FAIL: BRE plus-escape found (use ERE)"; exit 1; }

# fresh server + full audit (stale-server trap)
npm run -s build || { echo "FAIL: build"; exit 1; }
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1
nohup npm run start -- -H 0.0.0.0 -p 3100 >/tmp/w13-server.log 2>&1 &
for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://100.110.64.90:3100/" || true)"
  [ "$code" != "000" ] && break
  sleep 1
done
[ "$code" != "000" ] || { echo "FAIL: server did not come up on :3100"; exit 1; }
npm run -s audit:browser || { echo "FAIL: browser audit"; exit 1; }
echo "PASS wave13-18"
