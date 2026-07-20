#!/usr/bin/env bash
# verify.sh — wave6-09 (retire 8 lower-case demo topics; preserve 25 demo questions)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DB="prisma/dev.db"
fail() { echo "FAIL: $1"; exit 1; }
q() { sqlite3 "$DB" "$1" 2>/dev/null; }

# Seed first so we assert against fresh state.
npm run db:seed 2>&1 | tail -3

TITLES=(
  "Загальні положення"
  "Дорожні знаки"
  "Дорожня розмітка"
  "Сигнали світлофора та регулювальника"
  "Проїзд перехресть"
  "Швидкість руху, обгін, зупинка"
  "Розташування транспортних засобів та маневрування"
  "Безпека руху та обов'язки водія"
)

# 1. None of the 8 demo topics is an ACTIVE topic after seed.
for t in "${TITLES[@]}"; do
  esc="${t//"'"/"''"}"   # double single-quotes for SQL; double-quoted pattern/replacement avoids backslash mangling
  n="$(q "SELECT COUNT(*) FROM Topic WHERE isActive=1 AND title='$esc';")"
  [ "${n:-0}" -eq 0 ] || fail "demo topic still active: '$t'"
done

# 2. The 25 demo questions are preserved: >= 24 published, isDemo, sourceType DEMO.
pub="$(q "SELECT COUNT(*) FROM Question WHERE isPublished=1 AND isDemo=1 AND sourceType='DEMO';")"
[ "${pub:-0}" -ge 24 ] || fail "only ${pub:-0} published demo questions (need >= 24) — demo content lost"

# 3. Idempotent re-seed keeps it true.
npm run db:seed 2>&1 | tail -2
pub2="$(q "SELECT COUNT(*) FROM Question WHERE isPublished=1 AND isDemo=1 AND sourceType='DEMO';")"
[ "${pub2:-0}" = "${pub:-0}" ] || fail "re-seed changed published demo count ($pub then $pub2)"

# 4. Typecheck + integration suite (demo-retired + seed-content still green).
npm run typecheck 2>&1 | tail -3
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"

echo "PASS: wave6-09 demo topics retired, $pub demo questions preserved"
