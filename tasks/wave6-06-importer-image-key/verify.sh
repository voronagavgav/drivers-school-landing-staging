#!/usr/bin/env bash
# verify.sh — wave6-06 (importer sets imageKey, no served-imageUrl write, idempotent, tier-safe)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
IMP="scripts/import-official.ts"
PLAN=".content-import/import_plan.json"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Static: sets imageKey, no longer writes a served /official-images/ path into imageUrl.
grep -q "imageKey" "$IMP" || fail "$IMP does not set imageKey"
grep -Eq "imageUrl[[:space:]]*[:=][[:space:]]*\`?/official-images/" "$IMP" \
  && fail "$IMP still writes a served /official-images/ path into imageUrl"

# 2. Still copies originals into the original tier.
grep -q "official-images" "$IMP" || fail "$IMP no longer references the original tier dir"

# 3. Typecheck.
npm run typecheck 2>&1 | tail -3

[ -f "$PLAN" ] || fail "$PLAN absent — cannot verify importer behaviour (official data required)"

# 4. Tier-safety: a planted restyled-live file must survive a re-import.
mkdir -p public/restyled-live
probe="public/restyled-live/__wave6probe__.png"
printf 'probe' > "$probe"

run_import() { npx tsx scripts/import-official.ts 2>&1; }
num() { grep -Eo "imported [0-9]+ official" | grep -Eo "[0-9]+" | head -1; }

o1="$(run_import)"; echo "$o1" | tail -3
N1="$(echo "$o1" | num || true)"
[ -n "${N1:-}" ] && [ "$N1" -ge 1 ] || fail "first import did not report an imported count"

[ -f "$probe" ] || { rm -f "$probe"; fail "re-import DELETED a public/restyled-live file (tier clobbered)"; }

# 5. Idempotent: second run exits 0 with the same count.
o2="$(run_import)"; echo "$o2" | tail -3
N2="$(echo "$o2" | num || true)"
[ "${N2:-x}" = "${N1:-y}" ] || fail "re-import not idempotent ($N1 then $N2 official questions)"

rm -f "$probe"

# 6. DB: imported official questions carry an imageKey on the image-bearing ones.
keyed="$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Question WHERE sourceType='OFFICIAL' AND imageKey IS NOT NULL;" 2>/dev/null || echo 0)"
[ "${keyed:-0}" -ge 1 ] || fail "no OFFICIAL question has imageKey set after import"

echo "PASS: wave6-06 importer sets imageKey, tier-safe, idempotent (official=$N1, keyed=$keyed)"
