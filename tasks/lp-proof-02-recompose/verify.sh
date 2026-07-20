#!/usr/bin/env bash
# lp-proof-02 verify — static gates for the proof-band recompose (browser render is lp-proof-03).
# Grep hygiene per root CLAUDE.md: ERE only, case-EXPLICIT Cyrillic, no `|| true` masking a check.
set -euo pipefail
cd "$(dirname "$0")/../.."

BODY=app/lp/v36/_body.tsx
COPY=app/lp/v36/copy.ts
HERO=app/lp/v36/_hero-prospekt.tsx
for f in "$BODY" "$COPY" "$HERO"; do [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }; done
fail() { echo "FAIL: $1"; exit 1; }

# ── 1. De-templated: the old three-tile dashboard classes are gone from _body.tsx ──
for tok in proof-grid proof-cell proof-val proof-lab proof-sub; do
  grep -qF "$tok" "$BODY" && fail "old dashboard class '$tok' still present in _body.tsx"
done

# ── 2. Numbers sourced from constants, not retyped ──
grep -qE 'BANK_B_FMT' "$COPY" || fail "copy.ts no longer references BANK_B_FMT"
grep -qE 'IMG_FMT'    "$COPY" || fail "copy.ts no longer references IMG_FMT"
grep -qE 'SECTIONS'   "$COPY" || fail "copy.ts no longer references SECTIONS"
grep -qF '757' "$BODY" && fail "figure literal '757' hardcoded in _body.tsx (must read from c.proof copy)"

# ── 3. Chip claim survives and is rendered ──
grep -qF 'Офіційний банк питань' "$COPY" || fail "chip claim «Офіційний банк питань» missing from copy.ts proof.chip"
grep -qE 'c\.proof\.chip' "$BODY" || fail "_body.tsx band no longer renders c.proof.chip"

# ── Extract the JSX proof-band region (between its two section comments) ──
BAND="$(awk '/\{\/\* ── PROOF BAND ── \*\/\}/{f=1} f{print} /\{\/\* ── FEATURE CARDS ── \*\/\}/{if(f)exit}' "$BODY")"
[ -n "$BAND" ] || fail "could not locate the JSX proof-band region (keep the PROOF BAND / FEATURE CARDS section comments)"

# ── 3a. Band outer keeps the `proof` class hook + 4. reveal class; no count-up counter ──
grep -qE 'className="[^"]*\bproof\b' <<<"$BAND" || fail "proof band outer lost its 'proof' class anchor hook"
grep -qE 'reveal' <<<"$BAND" || fail "proof band lost its 'reveal' gsap class"
grep -qE 'background-clip' "$BODY" && fail "gradient/clip-to-text introduced in _body.tsx (banned)"

# ── 5. Copy laws over the two changed files (per-line conditional, case-explicit) ──
for f in "$BODY" "$COPY"; do
  grep -qF 'ГСЦ МВС' "$f" && fail "«ГСЦ МВС» present in $f (banned)"
  # «підписк» only allowed on a line that also carries «не» or «без»
  while IFS= read -r line; do
    grep -qE '[Нн]е|[Бб]ез' <<<"$line" || fail "«підписк» without «не»/«без» on a line in $f: $line"
  done < <(grep -nE '[Пп]ідписк' "$f" || true)
  # «гаранті» only allowed on a line that also carries «не » (trailing space)
  while IFS= read -r line; do
    grep -qE '[Нн]е ' <<<"$line" || fail "«гаранті» without «не » on a line in $f: $line"
  done < <(grep -nE '[Гг]аранті' "$f" || true)
done
# «понад» must not appear in the proof-band copy region of copy.ts (no rounding of the figure)
PROOFCOPY="$(awk '/proof:/{f=1} f{print} /features:/{if(f)exit}' "$COPY")"
grep -qE '[Пп]онад' <<<"$PROOFCOPY" && fail "«понад» (rounding) present in copy.ts proof copy — figure must be exact"

# ── 7. Regression gates ──
npm run -s typecheck || fail "typecheck non-zero"
bash scripts/funnel-donot-guard.sh || fail "funnel-donot-guard failed"

# ── 8. Scope locked ──
CHANGED="$(git diff --name-only -- app lib components scripts bin app/lp 2>/dev/null | sort -u)"
EXPECTED=$'app/lp/v36/_body.tsx\napp/lp/v36/copy.ts'
if [ "$CHANGED" != "$EXPECTED" ]; then
  echo "FAIL: task changed files beyond the two-file scope:"; echo "--- got ---"; echo "$CHANGED"; echo "--- want ---"; echo "$EXPECTED"; exit 1
fi
git diff --quiet -- "$HERO" || fail "_hero-prospekt.tsx has a diff (must be zero)"

# Section order: {hero} < PROOF BAND comment < id="features"
lh="$(grep -nF '{hero}' "$BODY" | head -1 | cut -d: -f1)"
lp="$(grep -nF '{/* ── PROOF BAND ── */}' "$BODY" | head -1 | cut -d: -f1)"
lf="$(grep -nE 'id="features"' "$BODY" | head -1 | cut -d: -f1)"
[ -n "$lh$lp$lf" ] || fail "could not locate hero/proof/features anchors"
[ "$lh" -lt "$lp" ] && [ "$lp" -lt "$lf" ] || fail "section order changed (want hero < proof < features; got $lh/$lp/$lf)"

echo "OK lp-proof-02"
