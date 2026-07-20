#!/usr/bin/env bash
# lp-pvar-06 verify — static acceptance: typecheck, funnel guard, copy laws, canonical byte-identity.
set -euo pipefail
cd "$(dirname "$0")/../.."

ART=tasks/lp-pvar-06-static-gates/STATIC-VERIFY.txt
: > "$ART"
log(){ printf '%s\n' "$1" | tee -a "$ART"; }
fail(){ printf 'FAIL: %s\n' "$1" | tee -a "$ART" >&2; exit 1; }

VDIRS=(app/lp/v36/p1 app/lp/v36/p2 app/lp/v36/p3)

# 1 — typecheck.
npm run -s typecheck >/dev/null 2>&1 || fail "npm run -s typecheck failed"
log "typecheck OK"

# 2 — funnel guard (global regression).
bash scripts/funnel-donot-guard.sh >/dev/null 2>&1 || fail "scripts/funnel-donot-guard.sh failed"
log "funnel-donot-guard PASS"

# 3 — copy laws on all new variant files.
for d in "${VDIRS[@]}"; do
  [ -d "$d" ] || fail "variant dir missing: $d (build 02-05 first)"
  if grep -rInF '757' "$d" --include='*.tsx'; then fail "literal 757 in a .tsx under $d (use BANK_B_FMT)"; fi
  for f in $(find "$d" -type f \( -name '*.tsx' -o -name '*.ts' \)); do
    while IFS= read -r line; do case "$line" in *[Пп]ідписк*) case "$line" in *[Нн]е\ *[Пп]ідписк*|*[Бб]ез\ *[Пп]ідписк*) : ;; *) fail "«підписка» без не/без у $f: $line";; esac;; esac; done < "$f"
    while IFS= read -r line; do case "$line" in *гаранті*) case "$line" in *не\ *гаранті*) : ;; *) fail "«гаранті-» без «не » у $f: $line";; esac;; esac; done < "$f"
    grep -qF 'ГСЦ МВС' "$f" && fail "«ГСЦ МВС» present in $f" || true
  done
done
log "copy laws PASS (no 757 literal, підписка/гаранті negation, no ГСЦ МВС)"

# 4a/4c/4d — canonical byte-identity.
git diff --exit-code app/lp/v36/_hero-prospekt.tsx >/dev/null 2>&1 || fail "_hero-prospekt.tsx must have ZERO diff"
[ "$(git diff --stat app/lp/v36/page.tsx | grep -cE '\|' || true)" = "0" ] || fail "app/lp/v36/page.tsx must be unchanged"
[ "$(git diff --stat app/lp/v36/copy.ts | grep -cE '\|' || true)" = "0" ] || fail "app/lp/v36/copy.ts must be unchanged"
log "canonical hero/page/copy byte-identical"

# 4b — _body.tsx additive: prop + conditional added; pre-existing proof rules intact.
grep -qE 'proofSlot\?:\s*React\.ReactNode' app/lp/v36/_body.tsx || fail "_body.tsx missing proofSlot optional prop"
grep -qE 'proofSlot\s*===\s*undefined' app/lp/v36/_body.tsx || fail "_body.tsx missing 'proofSlot === undefined' branch"
for rule in '.v36 .proof{' '.proof-card{' '.proof-say{' '.proof-num{'; do
  grep -qF "$rule" app/lp/v36/_body.tsx || fail "pre-existing proof CSS rule removed/edited: $rule"
done
log "_body.tsx additive-only (proof rules intact)"

# 5 — noindex layouts.
for d in "${VDIRS[@]}"; do
  grep -qE 'index:\s*false' "$d/layout.tsx" 2>/dev/null || fail "$d/layout.tsx missing robots index:false"
done
log "all three variant layouts noindexed"

# 6 — whole-effort diff-scope: only app/lp/v36/** touched (task dirs excluded).
scope="$(git status --porcelain | grep -vE '^..? +tasks/lp-pvar-' | grep -vE '^..? +app/lp/v36/' || true)"
[ -z "$scope" ] || fail "files changed outside app/lp/v36/** (and task dirs):\n$scope"
log "diff scope OK (app/lp/v36/** only)"

echo "OK lp-pvar-06"
