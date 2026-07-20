#!/usr/bin/env bash
# verify.sh — readiness-trend-01-investigate-conventions
# Gate: baseline test suite is green AND the journal records the required findings.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

JOURNAL="tasks/readiness-trend-01-investigate-conventions/journal.md"

# 1. Baseline suite green with the stated 29 tests.
out="$(npm test 2>&1)"
echo "$out" | tail -8
echo "$out" | grep -Eq "Tests[[:space:]]+29 passed" \
  || { echo "FAIL: expected vitest baseline of 29 passing tests"; exit 1; }

# 2..5. Findings recorded: the driver must have written a non-stub Findings section
# that captures the threshold-placement decision and the collision check.
grep -q "READINESS_TREND_THRESHOLD" "$JOURNAL" \
  || { echo "FAIL: journal Findings must name READINESS_TREND_THRESHOLD (threshold placement decision)"; exit 1; }
# Findings section must contain real content (not just the scaffold comment).
awk '/^## Findings$/{f=1;next} /^## /{f=0} f && /[A-Za-z]/ && $0 !~ /^<!--/ && $0 !~ /-->/ {print}' "$JOURNAL" | grep -q . \
  || { echo "FAIL: ## Findings section is empty / still a stub"; exit 1; }

echo "PASS: baseline green + findings recorded"
