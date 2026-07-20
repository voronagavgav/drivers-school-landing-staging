#!/usr/bin/env bash
# wave24-02: FSRS-6 retrievability oracle — python predict.py cross-checked vs trusted TS to 6dp.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIR="scripts/fsrs-fit"
PY="$DIR/.venv/bin/python"
PREDICT="$DIR/predict.py"
EMIT="$DIR/emit-ts-retrievability.ts"
GRID="$DIR/fixtures/retrievability-grid.json"
OUT="tasks/wave24-02-retrievability-oracle-crosscheck/PREVERIFY-OUTPUT.txt"

[ -x "$PY" ]      || { echo "FAIL: venv python missing (run wave24-01)"; exit 1; }
[ -f "$PREDICT" ] || { echo "FAIL: $PREDICT missing"; exit 1; }
[ -f "$EMIT" ]    || { echo "FAIL: $EMIT missing"; exit 1; }
[ -f "$GRID" ]    || { echo "FAIL: $GRID missing"; exit 1; }

# 1. predict.py does not import/shell TS/JS (ignore comment lines).
if grep -nE '^[^#]*(subprocess|tsx|\bnode )' "$PREDICT"; then
  echo "FAIL: predict.py appears to shell out to TS/JS"; exit 1; fi

# 2 + 5. Self-check anchors + cross-check, captured verbatim.
{ echo "static evidence — read, do not run"; "$PY" "$PREDICT" --self-check; } > "$OUT" 2>&1 \
  || { echo "FAIL: predict.py --self-check exited non-zero"; cat "$OUT"; exit 1; }
grep -qF "ok anchor elapsed0 R=1"  "$OUT" || { echo "FAIL: elapsed0 anchor missing"; exit 1; }
grep -qF "ok anchor elapsedS R=0.9" "$OUT" || { echo "FAIL: elapsedS anchor missing"; exit 1; }
if grep -Eq 'MISMATCH|FAIL|not ok' "$OUT"; then echo "FAIL: failure marker in self-check"; exit 1; fi

# 5. CROSS-CHECK: predict.py on the frozen grid agrees with TS-frozen r to < 1e-6.
"$PY" "$PREDICT" --crosscheck "$GRID" >> "$OUT" 2>&1 \
  || { echo "FAIL: predict.py --crosscheck exited non-zero"; cat "$OUT"; exit 1; }
grep -Eq 'ok crosscheck maxabsdiff=' "$OUT" || { echo "FAIL: crosscheck marker missing"; exit 1; }

# 4. TS re-emits the grid byte-stably and equals the frozen fixture (6dp).
npx tsx --conditions=react-server "$EMIT" > /tmp/w24-ts-grid.json 2>/dev/null \
  || { echo "FAIL: TS emitter failed"; exit 1; }
"$PY" - "$GRID" /tmp/w24-ts-grid.json <<'PYEOF' >> "$OUT" 2>&1 \
  || { echo "FAIL: TS-vs-fixture regen check failed"; cat "$OUT"; exit 1; }
import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
ka={(round(x["stability"],6),round(x["elapsedDays"],6)):round(x["r"],6) for x in a}
kb={(round(x["stability"],6),round(x["elapsedDays"],6)):round(x["r"],6) for x in b}
assert ka.keys()==kb.keys(), "grid keys differ"
m=max(abs(ka[k]-kb[k]) for k in ka)
print(f"ok ts_regen maxabsdiff={m}")
assert m < 1e-6, f"MISMATCH ts_regen {m}"
PYEOF

# 3. Grid shape: 25 points, anchors present.
"$PY" - "$GRID" >> "$OUT" 2>&1 <<'PYEOF' || { echo "FAIL: grid shape/anchor check failed"; cat "$OUT"; exit 1; }
import json,sys
g=json.load(open(sys.argv[1]))
assert len(g)==25, f"want 25 grid points, got {len(g)}"
for x in g:
    if x["elapsedDays"]==0: assert round(x["r"],6)==1.0, x
    if x["elapsedDays"]==x["stability"]: assert round(x["r"],6)==0.9, x
print("ok grid points=25 anchors ok")
PYEOF

# 6. typecheck.
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
echo "ok typecheck exit=0" >> "$OUT"

echo "PASS wave24-02"
