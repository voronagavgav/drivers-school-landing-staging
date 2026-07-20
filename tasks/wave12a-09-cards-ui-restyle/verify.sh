#!/usr/bin/env bash
# wave12a-09 — cards/badges/meters recolored to tokens, opaque reading surfaces.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
U="components/ui.tsx"

[ -f "$U" ] || { echo "FAIL: $U missing"; exit 1; }

# Card opaque + no backdrop
card="$(awk '/export function Card/{f=1} f{print} f&&/^}/{f=0}' "$U")"
echo "$card" | grep -qE 'bg-card|bg-card-tint|\bsolid\b' || { echo "FAIL: Card must use an opaque token surface"; exit 1; }
echo "$card" | grep -qiE 'backdrop' && { echo "FAIL: Card must NOT be glass (opaque reading surface)"; exit 1; } || true

# no white text on any tinted (green/coral/amber/mint) class anywhere in the file
if grep -nE '(bg-(green[a-z-]*|amber|warn|go|lane|danger))[^"'"'"']*text-white|text-white[^"'"'"']*(bg-(green[a-z-]*|amber|warn|go|lane|danger))' "$U"; then
  echo "FAIL: white text on a tinted surface"; exit 1; fi

# Field uses token border
grep -qE 'border-line' "$U" || { echo "FAIL: Field/inputs should use border-line token"; exit 1; }

npm run typecheck
npm run build
npm test
echo "PASS wave12a-09"
