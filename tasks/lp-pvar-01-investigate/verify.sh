#!/usr/bin/env bash
# lp-pvar-01 verify — the deliverable is FINDINGS.md; assert it exists and carries every
# required anchor, and that this task touched ONLY its own task dir. Static read-only checks
# (no execution of product code): the evaluator confirms substance by READING FINDINGS.md.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=tasks/lp-pvar-01-investigate/FINDINGS.md
fail(){ printf 'FAIL: %s\n' "$1" >&2; exit 1; }

[ -f "$F" ] || fail "FINDINGS.md missing"

# Required anchors (substance tokens, not TODO placeholders). Each must be present.
for tok in \
  "proofSlot" "_body.tsx" "restyled-live" "BANK_B_FMT" "IMG_FMT" "SECTIONS" \
  "robots" "index: false" "Батьківщина" "484" "DRIVER_BROWSER_CMD" \
  "funnel-donot-guard" "FUNNEL_FILES" "page.tsx" ; do
  grep -qF "$tok" "$F" || fail "FINDINGS.md missing required anchor: $tok"
done

# No un-filled placeholders left in the deliverable.
grep -qiE '\bTODO\b|<fill|FIXME' "$F" && fail "FINDINGS.md still has TODO/placeholder text" || true

# Restyled inventory must list the real glob count (60) and at least 12 candidate .png names.
grep -qE '\b60\b' "$F" || fail "FINDINGS.md must record the restyled-live count (60)"
n_png="$(grep -oE '[0-9]+_[0-9]+_[0-9]+\.png' "$F" | sort -u | wc -l | tr -d ' ')"
[ "$n_png" -ge 12 ] || fail "FINDINGS.md lists only $n_png restyled candidates (<12)"

# Scope: only this task dir changed. The sibling lp-pvar-02..07 task dirs were scaffolded
# by the planner in the same batch and are still untracked (`??`); this INVESTIGATION task
# did not create them and must not remove them. Tolerate those untracked sibling scaffolds
# while still catching any real product-source leak (a modified/added file elsewhere).
dirty="$(git status --porcelain \
  | grep -vE '^..? +tasks/lp-pvar-01-investigate/' \
  | grep -vE '^\?\? tasks/lp-pvar-0[2-9]' || true)"
[ -z "$dirty" ] || fail "changes outside task dir:\n$dirty"

echo "OK lp-pvar-01"
