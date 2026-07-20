#!/usr/bin/env bash
# wave21-03: pure model implements the new class logic; unit tests re-frozen from the python oracle.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SRC="lib/study-plan.ts"
T="lib/study-plan.test.ts"
[ -f "$SRC" ] || { echo "FAIL: $SRC missing"; exit 1; }

# Additive field + branches present.
grep -q "reviewLoad" "$SRC" || { echo "FAIL: $SRC missing reviewLoad field"; exit 1; }

# Purity: no live clock / rng in the module (Date.UTC for day-key parsing is allowed).
if grep -nE "Date\.now|new Date\(|Math\.random" "$SRC"; then
  echo "FAIL: $SRC uses a live clock / rng"; exit 1
fi
if grep -q "@/" "$SRC"; then echo "FAIL: $SRC must stay self-contained (no @/ imports)"; exit 1; fi

# Copy gate (scoped to the two multi-day branch strings, NOT a whole-file grep).
# The PRIORITIZE + MAINTENANCE returned messages must not threaten failure («встигнете»).
# Extract each branch's message string literal region heuristically and check tokens.
node - "$SRC" <<'NODE'
const fs = require("fs");
const src = fs.readFileSync(process.argv[2], "utf8");
// Grab all template/string literals that look like user-facing plan copy.
const lits = [...src.matchAll(/`([^`]*)`/g)].map(m => m[1]);
const hasMaint = lits.some(s => s.includes("повторюйте") && !s.includes("встигнете"));
if (!hasMaint) { console.error("FAIL: no MAINTENANCE copy («повторюйте», no «встигнете»)"); process.exit(1); }
const hasPrioritize = lits.some(s =>
  !s.includes("встигнете") &&
  (s.includes("пріоритиз") || s.includes("найважлив") || s.includes("слаб")));
if (!hasPrioritize) { console.error("FAIL: no PRIORITIZE copy (prioritize cue, no «встигнете»)"); process.exit(1); }
console.log("copy gate ok");
NODE

echo "=== typecheck ==="
npm run -s typecheck
echo "=== npm test ==="
npm test

# The re-frozen unit test file references the new field.
grep -q "reviewLoad" "$T" || { echo "FAIL: $T not re-frozen with reviewLoad inputs"; exit 1; }

echo "PASS: wave21-03"
