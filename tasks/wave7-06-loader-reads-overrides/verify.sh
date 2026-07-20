#!/usr/bin/env bash
# verify.sh — wave7-06 (loader reads + applies corrections overrides; docs synced)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
IMP="scripts/import-official.ts"
DOC="docs/CONTENT-ARCHITECTURE.md"
OVDIR=".content-import/overrides"
DB="prisma/dev.db"
fail() { echo "FAIL: $1"; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 not available"

# 1. Loader reads the override dir + applies the pure merge.
grep -q "overrides" "$IMP" || fail "$IMP must read .content-import/overrides/<key>.json"
grep -Eq "applyOverride|content-override" "$IMP" || fail "$IMP must apply overrides via applyOverride"

# 2. Committed override dir marker present.
{ [ -f "$OVDIR/.gitkeep" ] || [ -f "$OVDIR/README.md" ]; } || fail "$OVDIR has no committed marker (.gitkeep/README.md)"

# 3. Docs document the override path + fields + shallow semantics.
grep -q "overrides/" "$DOC" || fail "$DOC must document the .content-import/overrides path"
for f in text options answer topic categories explanation imageKey; do
  grep -q "$f" "$DOC" || fail "$DOC override-shape doc missing field: $f"
done

# 4. Behavioral: an override changes the question text in place (same id); removal restores it.
npm run db:seed 2>&1 | tail -3
QK="$(sqlite3 "$DB" "SELECT questionKey FROM Question WHERE sourceType='OFFICIAL' AND questionKey IS NOT NULL ORDER BY questionKey LIMIT 1;")"
[ -n "$QK" ] || fail "no official questionKey found to test override against"
ID0="$(sqlite3 "$DB" "SELECT id FROM Question WHERE questionKey='$QK';")"
NEWTEXT="WAVE7-OVERRIDE-PROBE-$QK"
mkdir -p "$OVDIR"
printf '{"text":"%s"}\n' "$NEWTEXT" > "$OVDIR/$QK.json"
cleanup() { rm -f "$OVDIR/$QK.json"; npx tsx "$IMP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

npx tsx "$IMP" 2>&1 | tail -3
GOTTEXT="$(sqlite3 "$DB" "SELECT text FROM Question WHERE questionKey='$QK';")"
ID1="$(sqlite3 "$DB" "SELECT id FROM Question WHERE questionKey='$QK';")"
[ "$GOTTEXT" = "$NEWTEXT" ] || fail "override did not change question text in place (got: $GOTTEXT)"
[ "$ID1" = "$ID0" ] || fail "override changed the question id ($ID0 -> $ID1) — must upsert in place"

# remove override + re-run → text restored to a non-override value.
rm -f "$OVDIR/$QK.json"
npx tsx "$IMP" 2>&1 | tail -3
RESTORED="$(sqlite3 "$DB" "SELECT text FROM Question WHERE questionKey='$QK';")"
[ "$RESTORED" != "$NEWTEXT" ] || fail "removing the override did not restore the plan text"
trap - EXIT

# 5. typecheck + unit suite green.
npm run typecheck 2>&1 | tail -3
npm test 2>&1 | tail -4

echo "PASS: wave7-06 loader applies overrides in place (same id), removal restores; docs synced"
