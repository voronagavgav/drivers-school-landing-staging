#!/usr/bin/env bash
# wave13-16 — 50MB budget + account meter/delete + auto-cache wiring.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

B="lib/offline/pack-budget.ts"
[ -f "$B" ] || { echo "FAIL: $B missing"; exit 1; }
grep -qF "52428800" "$B" || { echo "FAIL: OFFLINE_PACK_BUDGET_BYTES must be 52428800"; exit 1; }
grep -qF "canDownload" "$B" || { echo "FAIL: canDownload missing"; exit 1; }
T="lib/offline/pack-budget.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qF "51380224" "$T" || { echo "FAIL: frozen over-budget vector missing"; exit 1; }
grep -qF "62914560" "$T" || { echo "FAIL: frozen single-huge-pack vector missing"; exit 1; }

grep -qF "canDownload" lib/offline/packs.ts || { echo "FAIL: downloadPack must consult canDownload"; exit 1; }
grep -rqF "ліміт 50 МБ" app components || { echo "FAIL: budget refusal copy missing"; exit 1; }

grep -rqF "Офлайн-пакети" app components || { echo "FAIL: account card heading missing"; exit 1; }
grep -rqF "з 50 МБ" app components || { echo "FAIL: usage meter copy missing"; exit 1; }
grep -rqF "Видалити" app components || { echo "FAIL: per-pack delete action missing"; exit 1; }
grep -rqF "Поки нічого не завантажено" app components || { echo "FAIL: empty state missing"; exit 1; }

# auto-cache effects reference the scopes through the shared primitive
grep -rqE 'downloadPack\((.*)?"mistakes"' app components || { echo "FAIL: mistakes auto-cache missing"; exit 1; }
grep -rqE 'downloadPack\((.*)?"saved"' app components || { echo "FAIL: saved auto-cache missing"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
lst="$(npx vitest list 2>/dev/null || true)"
echo "$lst" | grep -q "pack-budget.test.ts" || { echo "FAIL: pack-budget.test.ts not in vitest list"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave13-16"
