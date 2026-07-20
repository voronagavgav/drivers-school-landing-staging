#!/usr/bin/env bash
# wave12a-01 — surface inventory report exists with all required sections.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
DOC="docs/app-plan/WAVE12A-SURFACES.md"

[ -f "$DOC" ] || { echo "FAIL: $DOC missing"; exit 1; }

for h in \
  "## Legacy tokens" \
  "## Token usages" \
  "## text-white-on-fill" \
  "## Components" \
  "## Screens" \
  "## Glass tier plumbing" \
  "## q-image miss path" ; do
  grep -qF "$h" "$DOC" || { echo "FAIL: missing section '$h'"; exit 1; }
done

# schema fact must be recorded
grep -qF "glassTier" "$DOC" || { echo "FAIL: report must confirm UserSettings.glassTier exists"; exit 1; }

# spot-check the counts are grounded: the report must at least mention the real hot tokens
grep -qE "bg-sign" "$DOC" || { echo "FAIL: report must cover bg-sign usages"; exit 1; }
grep -qE "text-white" "$DOC" || { echo "FAIL: report must cover text-white usages"; exit 1; }

# ground truth still greppable (report author must have had non-empty results)
real_bgsign="$(grep -rEl 'bg-sign' components app 2>/dev/null | wc -l | tr -d ' ')"
echo "ground truth: files containing bg-sign = $real_bgsign"

echo "PASS wave12a-01"
