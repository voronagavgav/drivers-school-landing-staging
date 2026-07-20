#!/usr/bin/env bash
# wave13-15 — pack download: client primitives + /progress affordance + dialog copy.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

P="lib/offline/packs.ts"
[ -f "$P" ] || { echo "FAIL: $P missing"; exit 1; }
for fn in estimatePack downloadPack listPacks deletePack packsUsageBytes; do
  grep -qF "$fn" "$P" || { echo "FAIL: $P missing $fn"; exit 1; }
done
grep -qF "ds-pack-images" "$P" || { echo "FAIL: image cache name ds-pack-images missing"; exit 1; }
grep -qF "w=540" "$P" || { echo "FAIL: images must be fetched at w=540"; exit 1; }
grep -qF "estimatedImageBytes" "$P" || { echo "FAIL: estimate must read estimatedImageBytes"; exit 1; }
for tok in "@/lib/db" "@/lib/auth" "@/lib/rbac" "server-only"; do
  grep -qF "$tok" "$P" && { echo "FAIL: server-graph import in packs.ts: $tok"; exit 1; }
done

grep -rqF "Завантажити для офлайн" app components || { echo "FAIL: download affordance copy missing"; exit 1; }
grep -rqF "Скасувати" app components || { echo "FAIL: dialog cancel action missing"; exit 1; }
grep -rqE 'МБ' app components lib/offline || { echo "FAIL: size-in-МБ copy missing"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s build || { echo "FAIL: build (client-bundle trap)"; exit 1; }
echo "PASS wave13-15"
