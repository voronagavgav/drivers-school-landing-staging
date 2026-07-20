#!/usr/bin/env bash
# verify.sh — wave10-01 (investigation): confirm the Findings map was actually produced.
set -euo pipefail
cd "$(dirname "$0")"
J="journal.md"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$J" ] || fail "journal.md missing"

# Extract the Findings section body (between '## Findings' and the next '## ').
findings="$(awk '/^## Findings$/{f=1;next} /^## /{f=0} f' "$J")"
# Strip the placeholder comment + blank lines.
body="$(echo "$findings" | grep -vE '^\s*<!--' | grep -vE '^\s*$' || true)"
[ -n "$body" ] || fail "## Findings is still empty/placeholder — investigation not done"

# The map must reference the load-bearing surfaces the implementation tasks need.
echo "$findings" | grep -q 'submitAnswer' || fail "Findings must map submitAnswer's write sequence"
echo "$findings" | grep -q 'recordMistakeOutcome' || fail "Findings must cover recordMistakeOutcome / tx approach"
echo "$findings" | grep -Eq 'TEST_MODES|MODE_LABEL' || fail "Findings must enumerate TEST_MODES/MODE_LABEL consumers"
echo "$findings" | grep -q 'schema.prisma' || fail "Findings must give schema back-relation insertion points"
echo "$findings" | grep -Eq 'migrate deploy' || fail "Findings must confirm the migrate-deploy mechanics"
# Must cite concrete locations (file:line references).
echo "$findings" | grep -Eq '[A-Za-z0-9_./-]+\.(ts|tsx|prisma):[0-9]+' \
  || fail "Findings must cite concrete file:line references"

echo "PASS: wave10-01 — Findings map present with the required surfaces"
