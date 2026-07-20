#!/usr/bin/env bash
# verify.sh — mvp-finish-01 (investigation gate: baseline green + findings populated)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
J="tasks/mvp-finish-01-investigate-stats-and-trend-wiring/journal.md"

# Investigation must NOT have created the implementation file.
[ ! -f lib/question-stats.ts ] || { echo "FAIL: lib/question-stats.ts exists — investigation must not implement"; exit 1; }

# Baseline suite still green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

# Findings section must be populated (not the placeholder), and mention the key anchors.
sec="$(awk '/^## Findings$/{f=1;next} /^## /{f=0} f' "$J")"
[ -n "$(echo "$sec" | tr -d '[:space:]')" ] || { echo "FAIL: ## Findings empty"; exit 1; }
echo "$sec" | grep -q "placeholder\|fill during execution" && { echo "FAIL: ## Findings still placeholder"; exit 1; }
for anchor in "TestAnswer" "readinessTrend" "ProgressSnapshot" "DemoBadge" "question-stats"; do
  echo "$sec" | grep -q "$anchor" || { echo "FAIL: ## Findings missing anchor: $anchor"; exit 1; }
done
# Must record the three exact trend labels.
for lbl in "вгору" "вниз" "стабільно"; do
  echo "$sec" | grep -q "$lbl" || { echo "FAIL: ## Findings missing trend label: $lbl"; exit 1; }
done

echo "PASS: mvp-finish-01 investigation complete (baseline green, findings populated)"
