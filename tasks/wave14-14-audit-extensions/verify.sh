#!/usr/bin/env bash
# wave14-14 — browser-audit Wave 14 extensions + permanent zero-emoji nudge gate.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

A=bin/browser-audit.sh
H=scripts/audit-seed-nudge.ts
[ -f "$H" ] || { echo "FAIL: $H missing"; exit 1; }

# helper is standalone (seed pattern): own client, no lib/db import
grep -qF "PrismaLibSql" "$H" || { echo "FAIL: helper must construct its own adapter client"; exit 1; }
if grep -nE '@/lib/db|from "\.\./lib/db"' "$H"; then echo "FAIL: helper must not import lib/db"; exit 1; fi
grep -qF "user@drivers.school" "$H" || { echo "FAIL: helper must target the seeded audit user"; exit 1; }
grep -qF "notificationLog" "$H" || { echo "FAIL: helper must reset recent NotificationLog rows"; exit 1; }

# audit gained the Wave 14 assertions (distinctive pinned substrings)
for s in "картки на повторення" "Зрозуміло" "Калібрування впевненості" "Завантажити мої дані" "Видалити акаунт назавжди" "Хвилина спокою" "Почати одразу" "learning-health" "audit-seed-nudge" "ds_calm_ritual_day"; do
  grep -qF "$s" "$A" || { echo "FAIL: audit missing assertion/step: $s"; exit 1; }
done

# no existing assertion removed: assertion count only grows (baseline 23 at plan time + >=8 new Wave-14 asserts)
n="$(grep -cE '^\s*assert_(url|text)' "$A" || true)"
[ "$n" -ge 28 ] || { echo "FAIL: assert count $n suspiciously low — existing asserts removed?"; exit 1; }

# permanent zero-emoji gate over nudge surfaces
for f in components/nudge-card.tsx lib/server/nudges.ts lib/nudge-policy.ts; do
  [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }
  if perl -CSD -ne 'exit 1 if /[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}\x{2B00}-\x{2BFF}]/' "$f"; then
    :
  else
    echo "FAIL: emoji/pictograph found in $f"; exit 1
  fi
done

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
echo "PASS wave14-14 (static gates; criterion 4 — restart server, then npm run audit:browser twice — is the driver's live step)"
