#!/usr/bin/env bash
# wave24-01: python venv + pinned requirements for the FSRS fit pipeline.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIR="scripts/fsrs-fit"
REQ="$DIR/requirements.txt"
SETUP="$DIR/setup-venv.sh"
VENV="$DIR/.venv"
OUT="tasks/wave24-01-python-env-requirements/PREVERIFY-OUTPUT.txt"

[ -f "$REQ" ]   || { echo "FAIL: $REQ missing"; exit 1; }
[ -f "$SETUP" ] || { echo "FAIL: $SETUP missing"; exit 1; }
[ -x "$SETUP" ] || { echo "FAIL: $SETUP not executable"; exit 1; }

# 1. Every requirement line is EXACT-pinned (name==version); ignore blanks/comments.
while IFS= read -r line; do
  case "$line" in ""|\#*) continue;; esac
  echo "$line" | grep -Eq '^[A-Za-z0-9_.\-]+==[0-9]' \
    || { echo "FAIL: unpinned requirement: $line"; exit 1; }
done < "$REQ"
grep -Eq '^fsrs==6\.3\.1' "$REQ" || { echo "FAIL: fsrs==6.3.1 not pinned in $REQ"; exit 1; }

# 2-3. Provision the venv (network in setup only).
bash "$SETUP" || { echo "FAIL: setup-venv.sh exited non-zero"; exit 1; }
[ -x "$VENV/bin/python" ] || { echo "FAIL: $VENV/bin/python missing after setup"; exit 1; }

# 4. Optimizer entry point imports + version is 6.3.1.
# py-fsrs 6.3.1 does NOT define fsrs.__version__ (its __init__ __getattr__ only
# lazy-loads Optimizer and raises AttributeError otherwise); the canonical version
# is read via importlib.metadata. Intent unchanged: Optimizer must import AND the
# installed fsrs must be exactly 6.3.1.
VER="$("$VENV/bin/python" -c "import fsrs; from fsrs import Optimizer; from importlib.metadata import version; print(version('fsrs'))" 2>&1)" \
  || { echo "FAIL: fsrs/Optimizer import failed: $VER"; exit 1; }
[ "$VER" = "6.3.1" ] || { echo "FAIL: fsrs.__version__=$VER (want 6.3.1)"; exit 1; }

# 5. Capture pip freeze evidence; every pin must appear.
{ echo "static evidence — read, do not run"; "$VENV/bin/pip" freeze; } > "$OUT"
grep -q "static evidence — read, do not run" "$OUT" || { echo "FAIL: evidence header missing"; exit 1; }
while IFS= read -r line; do
  case "$line" in ""|\#*) continue;; esac
  pkg="$(echo "$line" | sed -E 's/==.*//')"
  grep -Eiq "^${pkg}==" "$OUT" || { echo "FAIL: pinned pkg not in pip freeze: $pkg"; exit 1; }
done < "$REQ"

# 6. venv is git-ignored.
git check-ignore -q "$VENV" || { echo "FAIL: $VENV not git-ignored"; exit 1; }
[ -z "$(git status --porcelain "$VENV" 2>/dev/null)" ] || { echo "FAIL: $VENV shows in git status"; exit 1; }

echo "PASS wave24-01"
