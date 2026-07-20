#!/usr/bin/env bash
# wave14-08 — calm ritual: client-only overlay, pinned copy, fail-open wiring, engine untouched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

C=components/calm-ritual.tsx
[ -f "$C" ] || { echo "FAIL: $C missing"; exit 1; }

grep -qE '^\s*"use client"' "$C" || { echo "FAIL: calm-ritual must be a client component"; exit 1; }
# client-bundle trap: no server-graph imports
if grep -nE '@/lib/server|@/lib/auth|@/lib/rbac|@/lib/db|server-only' "$C"; then
  echo "FAIL: server-graph import in client component"; exit 1
fi

# pinned copy + skip action + storage key
grep -qF "Хвилина спокою — і починаємо. Це тренування формату, не вирок." "$C" || { echo "FAIL: pinned ritual copy missing"; exit 1; }
grep -qF "Почати одразу" "$C" || { echo "FAIL: skip button label missing"; exit 1; }
grep -qF "ds_calm_ritual_day" "$C" || { echo "FAIL: localStorage twice-a-day guard missing"; exit 1; }
grep -qF "requestSubmit" "$C" || { echo "FAIL: must submit the real form via requestSubmit"; exit 1; }
grep -qE 'prefers-reduced-motion|reduceMotion|reduced-motion' "$C" || { echo "FAIL: reduced-motion path missing"; exit 1; }

# no-pressure rule: no visible countdown/timer/progress UI
if grep -nE 'progress-bar|<progress|countdown' "$C"; then
  echo "FAIL: no timers/progress on the calm screen"; exit 1
fi

# analytics events registered
grep -qF '"calm_ritual_started"' lib/constants.ts || { echo "FAIL: calm_ritual_started not in ANALYTICS_EVENTS"; exit 1; }
grep -qF '"calm_ritual_skipped"' lib/constants.ts || { echo "FAIL: calm_ritual_skipped not in ANALYTICS_EVENTS"; exit 1; }

# both exam CTAs wired. wave14-01 finding 1d: the ONLY two mode=EXAM_SIMULATION forms are the
# dashboard CTA and the result-page «Пройти ще раз» repeat — the practice page has NO exam form
# (its CTAs are ADAPTIVE/SPACED/MIXED/TOPIC, which the Goal forbids the ritual from touching). The
# original practice-page grep was unsatisfiable without violating that rule, so it now checks the
# real second exam surface (the result page).
grep -qF "CalmRitual" "app/(app)/dashboard/page.tsx" || { echo "FAIL: dashboard exam CTA not wrapped"; exit 1; }
grep -qF "CalmRitual" "app/(app)/test/[id]/result/page.tsx" || { echo "FAIL: result-page exam CTA not wrapped"; exit 1; }

# engine untouched
for f in app/actions/test.ts lib/server/test-engine.ts; do
  if ! git diff --quiet HEAD -- "$f" 2>/dev/null; then echo "FAIL: $f must not change"; exit 1; fi
done

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave14-08 (static gates; run the journal's browser steps 6a-6c against the live server)"
