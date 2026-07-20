#!/usr/bin/env bash
# wave12a-02 — tokens + glass :root + static field + fonts.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
G="app/globals.css"
L="app/layout.tsx"

# -e marks the arg as a PATTERN — tokens begin with `--` and would otherwise be
# parsed as a grep OPTION (`unrecognized option '--radius-tray'`). See CLAUDE.md learning.
req() { grep -qF -e "$1" "$2" || { echo "FAIL: '$1' missing from $2"; exit 1; }; }

# 1. new palette hexes
for kv in \
  "--color-field:#FBFAF7" "--color-ink:#1F2933" "--color-muted:#46515D" "--color-line:#E1E7EC" \
  "--color-green-soft:#9AD9B8" "--color-green-deep:#226157" "--color-green-ink:#173B30" \
  "--color-warn:#B4532E" "--color-warm-ink:#6A4A28" "--color-amber:#8A5E0E" \
  "--color-card:#FCFDFE" "--color-card-tint:#F3F7F8" ; do
  # tolerate spaces around ':' by stripping them from both sides
  key="${kv%%:*}"; val="${kv#*:}"
  grep -Eq -e "$key[[:space:]]*:[[:space:]]*${val}" "$G" || { echo "FAIL: token $kv missing/misvalued in $G"; exit 1; }
done

# 2. radii + ease
for k in "--radius-tray" "--radius-glass" "--radius-card" "--radius-chip" "--radius-pill" "--ease-calm"; do
  req "$k" "$G"; done

# 3. backward-compat aliases still defined
for k in "--color-sign" "--color-asphalt" "--color-paper" "--color-danger" "--color-go" "--color-lane"; do
  req "$k" "$G"; done

# 4. glass :root mechanics
for k in "--glass-tint" "--e1-fill" "--e1-blur" "--e2-fill" "--e3-fill" "--rim" "--float" \
         "--ok-fill" "--no-fill" "--mark-fill" "--m-learn" "--m-near" "--m-strong"; do
  req "$k" "$G"; done

# 5. static field, no drift animation
grep -qE 'body::before' "$G" || { echo "FAIL: static pastel field body::before missing"; exit 1; }
if grep -qE '@keyframes[[:space:]]+drift|\.drift' "$G"; then echo "FAIL: drift animation must NOT be in the app (static field only)"; exit 1; fi

# 6. fonts
grep -qE 'Nunito' "$L" || { echo "FAIL: Nunito not wired in layout"; exit 1; }
grep -qE 'Manrope' "$L" || { echo "FAIL: Manrope not wired in layout"; exit 1; }
if grep -qE 'Oswald' "$L"; then echo "FAIL: Oswald must be removed from layout"; exit 1; fi
grep -qE 'display:[[:space:]]*"optional"' "$L" || { echo "FAIL: font display:optional required"; exit 1; }
grep -qE 'cyrillic' "$L" || { echo "FAIL: cyrillic subset required"; exit 1; }

# 8/9 typecheck + build
npm run typecheck
npm run build

echo "PASS wave12a-02"
