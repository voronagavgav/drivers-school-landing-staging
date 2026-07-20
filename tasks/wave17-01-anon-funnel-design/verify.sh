#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
DOC=docs/strategy/wave17-anon-funnel-adr.md
[ -f "$DOC" ] || { echo "FAIL: ADR $DOC missing"; exit 1; }
for h in \
  '## Anon-session model' \
  '## Cookie & identity' \
  '## Unblock strategy' \
  '## Migration & IDOR' \
  '## Flag gating' \
  '## Non-goals' \
  '## Task map' ; do
  grep -qF "$h" "$DOC" || { echo "FAIL: ADR missing section: $h"; exit 1; }
done
# Substance anchors (each section must name its pinned decision, not just the heading)
grep -q 'isAnonymous' "$DOC" || { echo "FAIL: anon-session model must name the isAnonymous decision"; exit 1; }
grep -q 'ds_anon_play' "$DOC" || { echo "FAIL: cookie section must name the anon-play cookie"; exit 1; }
grep -q 'requirePlayableUser' "$DOC" || { echo "FAIL: unblock section must name the resolver"; exit 1; }
grep -q 'VALUE_FIRST_FUNNEL' "$DOC" || { echo "FAIL: flag section must name VALUE_FIRST_FUNNEL"; exit 1; }
grep -qi 'convert-in-place\|convert in place\|in-place' "$DOC" || { echo "FAIL: migration approach not pinned"; exit 1; }
# Task map must reference the downstream tasks
grep -q 'wave17-05' "$DOC" || { echo "FAIL: task map missing wave17-05 reference"; exit 1; }
echo "PASS: wave17-01 ADR present with all pinned sections"
