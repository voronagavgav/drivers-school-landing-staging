#!/usr/bin/env bash
# wave13-09 — per-user clientEventId namespacing, single helper, suites green, no schema change.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

grep -qF "namespacedEventId" lib/server/study.ts || { echo "FAIL: namespacedEventId helper missing from lib/server/study.ts"; exit 1; }
grep -qF "namespacedEventId" lib/server/test-engine.ts || { echo "FAIL: submitAnswer tx guard must use the helper"; exit 1; }
# the prefixed template is built in exactly one place
# (pattern requires an eventId-shaped RHS: the original `\$\{…[uU]serId\}:\$\{` false-flagged
# lib/auth.ts's pre-existing session-token payload `${userId}:${tokenVersion}:${exp}`, which is
# not an event id — narrowed 2026-07-02, intent unchanged)
n="$(grep -rEc '\$\{userId\}:\$\{' lib/server/study.ts 2>/dev/null | tr -d ' ' || true)"
others="$(grep -rlE '\$\{[A-Za-z]*[uU]serId\}:\$\{[A-Za-z]*[eE]ventId\}' lib app --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v 'lib/server/study.ts' || true)"
[ -z "$others" ] || { echo "FAIL: prefixed id built outside the helper: $others"; exit 1; }

# behavior test present: two users, same raw id
grep -rqE "shared-" lib/server/*.integration.test.ts || { echo "FAIL: two-user shared-raw-id test missing"; exit 1; }

# no schema change: migration-dir count frozen at 9 (plan time, 2026-07-02) and schema untouched
m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9 — no migration expected this wave"; exit 1; }
git diff --name-only HEAD -- prisma/schema.prisma | grep -qE '.' && { echo "FAIL: schema.prisma must not change"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS wave13-09"
