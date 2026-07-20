#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=lib/test-engine/diagnostic.ts
T=lib/test-engine/diagnostic.test.ts
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -q 'NOT_IMPLEMENTED_WAVE15_06' "$S" || { echo "FAIL: stub must throw NOT_IMPLEMENTED_WAVE15_06"; exit 1; }
grep -q 'selectDiagnostic' "$S" || { echo "FAIL: stub missing selectDiagnostic"; exit 1; }
grep -q 'DiagnosticCandidate' "$S" || { echo "FAIL: stub missing DiagnosticCandidate"; exit 1; }
grep -q 'selectDiagnostic' "$T" || { echo "FAIL: oracle never calls selectDiagnostic"; exit 1; }
grep -q 'CATEGORY_B_BLUEPRINT' "$T" || { echo "FAIL: oracle must run against CATEGORY_B_BLUEPRINT"; exit 1; }
if grep -En 'server-only|@/lib/db|lib/generated|Math\.random|Date\.now|new Date\(' "$S"; then
  echo "FAIL: forbidden token in diagnostic.ts"; exit 1
fi
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
if npx vitest run lib/test-engine/diagnostic.test.ts >/dev/null 2>&1; then
  echo "FAIL: oracle GREEN against stub — does not bind"; exit 1
fi
shasum -a 256 "$T" > tasks/wave15-05-diagnostic-oracle/oracle.sha256
echo "OK wave15-05 (oracle frozen, red against stub)"
