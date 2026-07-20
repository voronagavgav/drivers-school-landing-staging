#!/usr/bin/env bash
# wave12a-05 — tier detector shell + server override read + no-flash + solid override.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S="lib/server/user-settings.ts"
C="components/glass-shell.tsx"
L="app/(app)/layout.tsx"
G="app/globals.css"

[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
grep -qE 'glassTier' "$S" || { echo "FAIL: $S must read glassTier"; exit 1; }
grep -qE '@/lib/db|from "@/lib/db"' "$S" || { echo "FAIL: $S must read via @/lib/db"; exit 1; }

[ -f "$C" ] || { echo "FAIL: $C missing"; exit 1; }
head -1 "$C" | grep -qE '"use client"|'"'"'use client'"'"'' || { echo "FAIL: $C must be a client component"; exit 1; }
grep -qE 'resolveGlassTier' "$C" || { echo "FAIL: $C must call resolveGlassTier (no duplicated matrix)"; exit 1; }
grep -qE 'glass-real' "$C" || { echo "FAIL: $C must set glass-real class"; exit 1; }
grep -qE 'glass-solid' "$C" || { echo "FAIL: $C must set glass-solid class"; exit 1; }
grep -qE 'bg-idle' "$C" || { echo "FAIL: $C must implement idle-freeze (bg-idle)"; exit 1; }

grep -qE 'GlassShell' "$L" || { echo "FAIL: layout must render GlassShell"; exit 1; }
grep -qE 'dangerouslySetInnerHTML' "$L" || { echo "FAIL: layout must emit an inline no-flash script"; exit 1; }
grep -qE 'user-settings' "$L" || { echo "FAIL: layout must read the glassTier override server-side"; exit 1; }

grep -qE 'body\.glass-solid|\.glass-solid' "$G" || { echo "FAIL: globals must define the glass-solid override"; exit 1; }

# no schema change
if git diff --name-only HEAD 2>/dev/null | grep -qE 'prisma/schema.prisma'; then
  echo "FAIL: schema changed (glassTier already exists — no migration this wave)"; exit 1; fi
if git status --porcelain 2>/dev/null | grep -qE 'prisma/migrations/'; then
  echo "FAIL: new migration added (no schema changes this wave)"; exit 1; fi

npm run typecheck
npm run build
echo "PASS wave12a-05"
