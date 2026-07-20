#!/usr/bin/env bash
# wave12a-06 — Світлик shared sprite + component.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
C="components/svitlyk.tsx"
L="app/(app)/layout.tsx"

[ -f "$C" ] || { echo "FAIL: $C missing"; exit 1; }
grep -qE 'SvitlykSprite' "$C" || { echo "FAIL: SvitlykSprite not exported"; exit 1; }
grep -qE 'export function Svitlyk|export const Svitlyk' "$C" || { echo "FAIL: Svitlyk not exported"; exit 1; }
grep -qF 'id="svitlyk"' "$C" || { echo "FAIL: #svitlyk symbol not ported"; exit 1; }
grep -qF 'id="lg"' "$C" || { echo "FAIL: #lg filter not ported"; exit 1; }
grep -qF 'viewBox="0 0 100 100"' "$C" || { echo "FAIL: symbol viewBox missing"; exit 1; }
grep -qF 'href="#svitlyk"' "$C" || { echo "FAIL: Svitlyk must <use href=#svitlyk>"; exit 1; }

# static in-app: no float animation
if grep -qE 'svFloat|animation-name|animation:' "$C"; then
  echo "FAIL: Світлик must be static in-app (no float animation)"; exit 1; fi

# sprite mounted once in shell
grep -qE 'SvitlykSprite' "$L" || { echo "FAIL: SvitlykSprite not mounted in (app) layout"; exit 1; }

npm run typecheck
npm run build
echo "PASS wave12a-06"
