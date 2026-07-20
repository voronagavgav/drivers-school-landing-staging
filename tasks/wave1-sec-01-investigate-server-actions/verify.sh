#!/usr/bin/env bash
# verify.sh — wave1-sec-01 (investigation gate: baseline green + findings populated, no code written)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
J="tasks/wave1-sec-01-investigate-server-actions/journal.md"

# Investigation must not have created the implementation module.
[ ! -f lib/validation.ts ] || { echo "FAIL: lib/validation.ts exists — investigation must not implement"; exit 1; }

# Findings populated (not the scaffold placeholder).
sec="$(awk '/^## Findings$/{f=1;next} /^## /{f=0} f' "$J")"
[ -n "$(echo "$sec" | tr -d '[:space:]')" ] || { echo "FAIL: ## Findings empty"; exit 1; }
echo "$sec" | grep -qi "Fill during execution" && { echo "FAIL: ## Findings still placeholder"; exit 1; }

# Must catalogue the key actions and name both error patterns + the validator decision.
for anchor in "loginAction" "registerAction" "submitAnswer" "selectCategoryAction" "createQuestion" "useActionState" "zod"; do
  echo "$sec" | grep -q "$anchor" || { echo "FAIL: ## Findings missing anchor: $anchor"; exit 1; }
done

# Baseline unit suite still green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-01 investigation complete (baseline green, findings populated)"
