#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
A=bin/browser-audit.sh
for m in QUICK MARATHON SIGN_TRAINER; do
  grep -q "$m" "$A" || { echo "FAIL: audit missing $m section"; exit 1; }
done
grep -qF -e 'відповідано' "$A" || { echo "FAIL: audit never asserts the marathon rolling counter"; exit 1; }
# no removed assertions (ERE; additions-only diff for the audit script)
removed="$(git diff -- "$A" | grep -cE '^-([^-]|$)' || true)"
removed_asserts="$(git diff -- "$A" | grep -E '^-([^-]|$)' | grep -cE 'assert_|bad ' || true)"
[ "${removed_asserts:-0}" -eq 0 ] || { echo "FAIL: existing audit assertions removed/changed ($removed_asserts lines)"; exit 1; }
# the audit itself is the gate (server must be running the CURRENT build — restart trap)
npm run audit:browser || { echo "FAIL: browser audit red (is :3100 running the fresh build?)"; exit 1; }
echo "OK wave15-15"
