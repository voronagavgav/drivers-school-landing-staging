#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
A=bin/browser-audit.sh
grep -q '/pricing' "$A" || { echo "FAIL: audit missing /pricing section"; exit 1; }
grep -q '/q/' "$A" || { echo "FAIL: audit missing public /q section"; exit 1; }
grep -q 'noindex' "$A" || { echo "FAIL: audit missing noindex assert"; exit 1; }
grep -q 'Правильна відповідь' "$A" || { echo "FAIL: audit missing reveal/no-leak asserts"; exit 1; }
grep -q 'Пропустити' "$A" || { echo "FAIL: audit missing JTBD skip assert"; exit 1; }
grep -q 'Не склав' "$A" || { echo "FAIL: audit missing exam-outcome form assert"; exit 1; }
bash -n "$A" || { echo "FAIL: audit script does not parse"; exit 1; }
# Scope: only the audit script changed
prod="$(git diff --name-only HEAD | grep -vE '^(tasks/|bin/browser-audit\.sh)' || true)"
[ -z "$prod" ] || { echo "FAIL: files outside the audit script changed: $prod"; exit 1; }
npm run audit:browser || { echo "FAIL: browser audit red"; exit 1; }
echo "OK wave16-15"
