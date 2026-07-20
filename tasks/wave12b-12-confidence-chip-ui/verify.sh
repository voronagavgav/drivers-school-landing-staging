#!/usr/bin/env bash
# wave12b-12 — sampled confidence chip row in the runner.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
R="components/test-runner.tsx"
grep -qE 'isConfidenceSampled' "$R" || { echo "FAIL: sampling helper not used"; exit 1; }
grep -qF 'Наскільки впевнено?' "$R" || { echo "FAIL: prompt copy missing"; exit 1; }
grep -qF 'Пропустити' "$R" || { echo "FAIL: skip control missing"; exit 1; }
grep -qE 'setAnswerConfidenceAction' "$R" || { echo "FAIL: follow-up action not wired"; exit 1; }
grep -qE 'EXAM_SIMULATION' "$R" || { echo "FAIL: exam guard missing near sampling"; exit 1; }
if grep -nE 'Math\.random' "$R"; then echo "FAIL: Math.random in runner"; exit 1; fi
npm run typecheck
npm test
npm run build
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh >/dev/null 2>&1 || { echo "FAIL: browser audit regressed"; exit 1; }
fi
echo "PASS wave12b-12"
