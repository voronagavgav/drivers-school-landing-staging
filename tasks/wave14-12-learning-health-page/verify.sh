#!/usr/bin/env bash
# wave14-12 — admin learning-health page + nav placement + RBAC guard.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

P=app/admin/learning-health/page.tsx
L=app/admin/layout.tsx
[ -f "$P" ] || { echo "FAIL: $P missing"; exit 1; }

grep -qF "requireContentManager" "$P" || { echo "FAIL: RBAC guard missing"; exit 1; }
grep -qF "getLearningHealth" "$P" || { echo "FAIL: page must render from getLearningHealth"; exit 1; }
grep -qF "Здоровʼя навчання" "$P" || { echo "FAIL: page heading missing"; exit 1; }
grep -qF "Розбіжностей не виявлено" "$P" || { echo "FAIL: outlier empty-state copy missing"; exit 1; }
grep -qF "/admin/readiness-shadow" "$P" || { echo "FAIL: readiness-shadow link missing"; exit 1; }

# nav entry present and placed AFTER «Готовність (тінь)» (first-mention line order)
grep -qF '"/admin/learning-health"' "$L" || { echo "FAIL: nav entry missing"; exit 1; }
grep -qF "Здоровʼя навчання" "$L" || { echo "FAIL: nav label missing"; exit 1; }
a="$(grep -n 'readiness-shadow' "$L" | head -1 | cut -d: -f1)"
b="$(grep -n 'learning-health' "$L" | head -1 | cut -d: -f1)"
[ -n "$a" ] && [ -n "$b" ] && [ "$a" -lt "$b" ] || { echo "FAIL: nav order — learning-health must follow readiness-shadow"; exit 1; }

# frozen oracle protected
if ! git diff --quiet HEAD -- lib/learning-health.test.ts 2>/dev/null; then
  echo "FAIL: lib/learning-health.test.ts modified — frozen oracle"; exit 1
fi

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave14-12"
