#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
DOC=docs/strategy/wave17-perf-floor.md
[ -f "$DOC" ] || { echo "FAIL: perf-floor note $DOC missing"; exit 1; }
grep -qi 'defer\|Gate-0\|Gate 0\|PSI\|CrUX' "$DOC" || { echo "FAIL: perf note must document the deferred hosted-PSI gate"; exit 1; }
grep -qi 'CLS\|reserve\|min-height\|skeleton' "$DOC" || { echo "FAIL: perf note must document CLS reservations"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "PASS: wave17-12 perf floor (local); hosted-PSI CWV is Gate-0 deferred"
