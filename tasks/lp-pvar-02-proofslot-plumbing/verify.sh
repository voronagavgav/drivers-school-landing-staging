#!/usr/bin/env bash
# lp-pvar-02 verify — proofSlot is an additive optional prop; canonical route byte-identical.
set -euo pipefail
cd "$(dirname "$0")/../.."

ART=tasks/lp-pvar-02-proofslot-plumbing/PLUMBING-VERIFY.txt
: > "$ART"
log(){ printf '%s\n' "$1" | tee -a "$ART"; }
fail(){ printf 'FAIL: %s\n' "$1" | tee -a "$ART" >&2; exit 1; }

B=app/lp/v36/_body.tsx

# 1 — optional prop present in the V36Body props type.
grep -qE 'proofSlot\?:\s*React\.ReactNode' "$B" || fail "proofSlot?: React.ReactNode not added to _body.tsx"

# 2 — the slot conditional distinguishes undefined from null (not truthy short-circuit).
grep -qE 'proofSlot\s*===\s*undefined' "$B" || fail "proof region must branch on 'proofSlot === undefined' (undefined→default band)"

# 5 — the pre-existing proof CSS rules are still present verbatim (no existing rule edited).
for rule in '.v36 .proof{' '.proof-card{' '.proof-say{' '.proof-num{'; do
  grep -qF "$rule" "$B" || fail "pre-existing proof CSS rule missing/edited: $rule"
done
# statement-band markup class still rendered by the default branch.
grep -qF 'proof-say' "$B" || fail "default proof band markup (proof-say) removed"

# 3/4 — hero zero-diff, canonical page zero-diff (vs committed HEAD).
git diff --exit-code app/lp/v36/_hero-prospekt.tsx >/dev/null 2>&1 || fail "_hero-prospekt.tsx must have ZERO diff"
pagediff="$(git diff --stat app/lp/v36/page.tsx | grep -cE '\|' || true)"
[ "$pagediff" = "0" ] || fail "app/lp/v36/page.tsx must be unchanged (canonical still passes no proofSlot)"

# 6 — typecheck.
npm run -s typecheck >/dev/null 2>&1 || fail "npm run -s typecheck failed"
log "typecheck OK"

# 8 — scope: only app/lp/v36/ + this task dir changed.
dirty="$(git status --porcelain | grep -vE '^..? +(app/lp/v36/|tasks/lp-pvar-02-proofslot-plumbing/)' || true)"
[ -z "$dirty" ] || fail "changes outside allowed scope:\n$dirty"

# 7 — canonical route still renders the statement band (best-effort browser check).
AB="${DRIVER_BROWSER_CMD:-}"
ORIGIN="${ORIGIN:-${AUDIT_ORIGIN:-http://localhost:3001}}"
if [ -n "$AB" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/lp/v36" || true)" = "200" ]; then
  "$AB" open "$ORIGIN/lp/v36" >/dev/null 2>&1 || true
  "$AB" wait --load networkidle >/dev/null 2>&1 || true
  txt="$("$AB" eval 'var e=document.querySelector(".proof");e?e.textContent:"NOPROOF"' 2>/dev/null || true)"
  "$AB" close >/dev/null 2>&1 || true
  case "$txt" in
    *"1 757"*986*|*986*"1 757"*) : ;;
    *) fail "canonical /lp/v36 .proof band did not render its figures: $txt" ;;
  esac
  case "$txt" in *"Офіційний банк питань"*) log "canonical proof band intact" ;; *) fail "canonical band missing chip claim: $txt" ;; esac
else
  log "SKIP browser check (no DRIVER_BROWSER_CMD or origin unreachable) — deferred to lp-pvar-07"
fi

echo "OK lp-pvar-02"
