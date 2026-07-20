#!/usr/bin/env bash
# verify.sh — wave9-04 (server content-stats aggregation; behaviour covered by task 07)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/server/content-stats.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Exists + exports getContentHealth.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (async function|function|const) getContentHealth\b' "$SRC" \
  || fail "$SRC must export getContentHealth"

# 2. Reuses the pure helpers (not re-derived).
grep -q 'content-stats' "$SRC" || fail "$SRC must import from @/lib/content-stats (summarizeQuestion)"
grep -q 'summarizeQuestion' "$SRC" || fail "$SRC must call summarizeQuestion"
grep -q 'content-flags' "$SRC" || fail "$SRC must import from @/lib/content-flags (flagQuestion)"
grep -q 'flagQuestion' "$SRC" || fail "$SRC must call flagQuestion"

# 3. Reads TestAnswer and the keyed joins.
grep -Eq 'testAnswer|TestAnswer' "$SRC" || fail "$SRC must read TestAnswer"
grep -q 'optionKey' "$SRC"   || fail "$SRC must join the option optionKey"
grep -q 'questionKey' "$SRC" || fail "$SRC must read Question.questionKey"
grep -Eq 'timeSpentSeconds' "$SRC" || fail "$SRC must read timeSpentSeconds (for avg time)"

# 4-5. Topic rollup present (per-topic aggregation).
grep -Eiq 'topic' "$SRC" || fail "$SRC must build a per-topic rollup"

# Server module (not a pure lib): it is expected to use server-only/@/lib/db — do NOT purity-grep it.
grep -q '@/lib/db' "$SRC" || fail "$SRC must read via @/lib/db (server data layer)"

# 7. No schema change from this task.
git diff --quiet HEAD -- prisma/schema.prisma || fail "prisma/schema.prisma changed — wave-9 is compute-on-read (NO schema change)"

# 8. typecheck green (compiles against the new pure libs + prisma client).
npm run typecheck 2>&1 | tail -3

echo "PASS: wave9-04 getContentHealth aggregates + reuses pure helpers + topic rollup; schema untouched; typecheck green"
