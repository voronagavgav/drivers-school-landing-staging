#!/usr/bin/env bash
# verify.sh — wave9-05 (content-health presentational parts)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="app/admin/content-health/parts.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Exists + exports both components.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) OptionDistribution\b' "$SRC" || fail "$SRC must export OptionDistribution"
grep -Eq 'export (function|const) FlagBadge\b' "$SRC" || fail "$SRC must export FlagBadge"

# 2. Bar sized by pickRate + marks the keyed-correct option.
grep -q 'pickRate' "$SRC"  || fail "OptionDistribution must size bars from pickRate"
grep -q 'isCorrect' "$SRC" || fail "OptionDistribution must mark the keyed-correct option (isCorrect)"

# 3. FlagBadge renders the label text.
grep -q 'label' "$SRC" || fail "FlagBadge must render flag.label"

# 4. Presentational only — no server/DB imports.
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC must stay presentational — found forbidden import '$tok'" || true
done

# 5. typecheck green.
npm run typecheck 2>&1 | tail -3

echo "PASS: wave9-05 OptionDistribution + FlagBadge present, presentational, typecheck green"
