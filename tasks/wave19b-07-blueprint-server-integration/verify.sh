#!/usr/bin/env bash
# wave19b-07 — server callers bucket by questionKey section; blueprint integration test un-skipped.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Both server callers route section explicitly (no displayOrder-based bucketing).
grep -Eq "sectionFromQuestionKey" lib/server/mastery-readiness.ts || { echo "FAIL: recomputeReadiness not using sectionFromQuestionKey"; exit 1; }
grep -Eq "sectionFromQuestionKey" lib/server/test-engine.ts || { echo "FAIL: exam composer not using sectionFromQuestionKey"; exit 1; }

# Integration test no longer hard-skips on a seeded DB (the demo-only skip may remain but the real assertions
# must be reachable — check the directional test title exists and is not wrapped in describe.skip).
T=lib/server/exam-blueprint.integration.test.ts
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -Eq "describe\.skip" "$T" && { echo "FAIL: blueprint integration suite still describe.skip"; exit 1; } || true
grep -Eqi "strong.*sign|sign.*strong|remainder|pdr" "$T" || { echo "FAIL: real-seed directional oracle absent"; exit 1; }

npm run -s typecheck

# Reseed then run integration (self-heal against accumulated audit rows), per CLAUDE.md ordering.
npm run -s db:seed
npm run -s test:integration

# Prove the blueprint integration suite is COLLECTED (retry until token present; herestring, not pipe).
LIST=""; for _ in 1 2 3 4 5; do LIST="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"; grep -q exam-blueprint <<<"$LIST" && break; done
grep -q exam-blueprint <<<"$LIST" || { echo "FAIL: exam-blueprint.integration not collected"; exit 1; }

echo "PASS wave19b-07"
