#!/usr/bin/env bash
# wave10f-01 verify: the reference-vectors gate EXISTS and is collected — but is NOT required to pass
# yet (it is RED until wave10f-02 fixes the prior-difficulty bug).
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/fsrs/reference-vectors.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Source header names the package+version+config; but ts-fsrs is NOT imported at runtime.
grep -q "ts-fsrs@5.4.1" "$F" || { echo "FAIL: header must name ts-fsrs@5.4.1"; exit 1; }
grep -q "enable_short_term" "$F" || { echo "FAIL: header must state enable_short_term config"; exit 1; }
if grep -Eq "(import|require).*ts-fsrs" "$F"; then echo "FAIL: ts-fsrs must not be imported"; exit 1; fi
if grep -q "ts-fsrs" package.json; then echo "FAIL: ts-fsrs must not be a repo dependency"; exit 1; fi

# Drives our schedule() and asserts closeness.
grep -q "schedule" "$F" || { echo "FAIL: test must drive schedule()"; exit 1; }
grep -q "toBeCloseTo" "$F" || { echo "FAIL: test must assert S/D via toBeCloseTo"; exit 1; }
# No skip/todo guards.
if grep -Eq "it\.todo|test\.todo|\.skip\(" "$F"; then echo "FAIL: no todo/skip guards allowed"; exit 1; fi

# Proof the file is collected by vitest (capture-to-var to avoid SIGPIPE under pipefail).
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "reference-vectors" || { echo "FAIL: vitest does not list reference-vectors"; exit 1; }

npm run typecheck
echo "PASS wave10f-01 (reference gate authored; RED until wave10f-02)"
