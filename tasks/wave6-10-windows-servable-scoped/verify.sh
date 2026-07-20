#!/usr/bin/env bash
# verify.sh — wave6-10 (practice/topic pickers list only servable + category-scoped topics)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/(app)/practice/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. The page applies the engine's demo rule + category scoping to the per-topic count.
grep -q "SERVE_DEMO_QUESTIONS" "$PAGE" \
  || fail "$PAGE does not apply the SERVE_DEMO_QUESTIONS (demoWhere) rule to the topic count"
grep -Eq "categoryId|selectedCategoryId" "$PAGE" || fail "$PAGE does not scope by category"
grep -q "isDemo" "$PAGE" || fail "$PAGE does not filter the count by isDemo (servability)"

# 2. Zero-count / 'Немає питань' disabled cards are gone (only servable topics render).
grep -q "Немає питань" "$PAGE" \
  && fail "$PAGE still renders the zero-count 'Немає питань' branch — drop empty topics instead"

# 3. MIXED_PRACTICE entry still present.
grep -q "MIXED_PRACTICE" "$PAGE" || fail "$PAGE lost the Змішана практика (MIXED_PRACTICE) entry"

# 4. Typecheck + suites.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "fast unit suite reported failures"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"

# 5. Optional browser check (served app, NON-localhost origin). Best-effort: a logged-in
#    practice page must show >=1 topic and none of the retired demo titles. Requires a session,
#    so this is informational here — the authoritative browser gate is `npm run audit:browser`.
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && [ -n "${PRACTICE_URL:-}" ]; then
  echo "browser: opening $PRACTICE_URL via \$DRIVER_BROWSER_CMD"
  if "$DRIVER_BROWSER_CMD" open "$PRACTICE_URL" 2>/dev/null; then
    txt="$("$DRIVER_BROWSER_CMD" get text body 2>/dev/null || true)"
    "$DRIVER_BROWSER_CMD" close 2>/dev/null || true
    echo "$txt" | grep -q "Загальні положення" \
      && echo "NOTE: retired demo topic visible — check auth/session before trusting this" || true
  fi
fi
echo "NOTE: run 'npm run audit:browser' against the non-localhost origin (official content imported)"
echo "      to confirm the category-B practice page shows only real, startable topics."

echo "PASS: wave6-10 practice page servable + category scoped"
