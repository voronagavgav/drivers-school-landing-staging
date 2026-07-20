#!/usr/bin/env bash
# wave12a-14 — audit extension + design-shots script.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
A="bin/browser-audit.sh"
S="bin/design-shots.sh"

[ -f "$A" ] || { echo "FAIL: $A missing"; exit 1; }

# 1. tab capsule + aria-current assertion added
grep -qE 'aria-current' "$A" || { echo "FAIL: browser-audit missing aria-current tab assertion"; exit 1; }
grep -qE 'Головна|Навчання|Іспит|Прогрес|Профіль' "$A" || { echo "FAIL: browser-audit missing tab-label assertion"; exit 1; }

# 2. existing 2b runner-answers assertion preserved
grep -qE 'Правильно\|Неправильно|Правильно|Неправильно' "$A" || { echo "FAIL: 2b runner-answers assertion lost"; exit 1; }

# 3. static no-white-on-green regression gate (this gate)
if grep -rnE '(bg-(sign|green[a-z-]*|danger|go|lane)|cta-glass)[^"'"'"']*text-white|text-white[^"'"'"']*(bg-(sign|green[a-z-]*|danger|go|lane)|cta-glass)' components app 2>/dev/null; then
  echo "FAIL: white-on-green regression somewhere in components/ or app/"; exit 1; fi

# 4. design-shots script
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
bash -n "$S"
grep -qE 'DRIVER_BROWSER_CMD' "$S" || { echo "FAIL: design-shots must use \$DRIVER_BROWSER_CMD"; exit 1; }
grep -qE '390' "$S" && grep -qE '844' "$S" || { echo "FAIL: design-shots missing 390x844"; exit 1; }
grep -qE '1440' "$S" && grep -qE '900' "$S" || { echo "FAIL: design-shots missing 1440x900"; exit 1; }
for r in login dashboard practice result mistakes; do
  grep -qE "/$r|$r" "$S" || { echo "FAIL: design-shots missing screen $r"; exit 1; }
done
grep -qE '/tmp/design-shots' "$S" || { echo "FAIL: design-shots must write /tmp/design-shots"; exit 1; }

# 6. scripts parse
bash -n "$A"

# 5. guarded shot run (only if server reachable)
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  echo "server up — running design-shots"
  bash "$S" "$ORIGIN" || true
  n="$(find /tmp/design-shots -maxdepth 1 -name '*.png' -size +3k 2>/dev/null | wc -l | tr -d ' ')"
  [ "$n" -ge 1 ] || { echo "FAIL: no non-trivial PNG produced"; exit 1; }
  echo "shots produced: $n"
else
  echo "SKIP shot generation: no server at $ORIGIN (full run is task 15)"
fi

echo "PASS wave12a-14"
