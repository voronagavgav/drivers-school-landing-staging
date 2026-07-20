#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=lib/test-engine/presets.ts
T=lib/test-engine/presets.test.ts
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -q 'NOT_IMPLEMENTED_WAVE15_04' "$S" || { echo "FAIL: stub must throw NOT_IMPLEMENTED_WAVE15_04 (no logic yet)"; exit 1; }
for fn in selectQuickQueue selectSignTrainerQueue selectMarathonPage; do
  grep -q "$fn" "$S" || { echo "FAIL: stub missing export $fn"; exit 1; }
  grep -q "$fn" "$T" || { echo "FAIL: oracle never exercises $fn"; exit 1; }
done
# purity of the stub/impl file (whole-file incl. comments — house rule)
if grep -En 'server-only|@/lib/db|lib/generated|Math\.random|Date\.now|new Date\(' "$S"; then
  echo "FAIL: forbidden token in presets.ts"; exit 1
fi
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
if npx vitest run lib/test-engine/presets.test.ts >/dev/null 2>&1; then
  echo "FAIL: oracle is GREEN against the stub — tests do not bind"; exit 1
fi
shasum -a 256 "$T" > tasks/wave15-03-preset-oracle/oracle.sha256
echo "OK wave15-03 (oracle frozen, red against stub)"
