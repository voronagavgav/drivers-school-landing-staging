#!/usr/bin/env bash
# wave24-01: provision the OFFLINE FSRS-6 weight-fit python environment.
#
# House rule: the system pip here is PEP-668-managed ("externally managed"), so
# we NEVER install into it. This creates a project-local venv under
# scripts/fsrs-fit/.venv and installs the EXACT-pinned deps from requirements.txt.
#
# NETWORK is used ONLY by this setup step (the pip install below). Once the venv
# exists, the fitter (wave24-03) and evaluator (wave24-04) run fully OFFLINE.
#
# The pinned set is the canonical py-fsrs optimizer stack: `fsrs==6.3.1` plus its
# declared optimizer deps (torch, numpy, pandas, tqdm), i.e. the equivalent of
# `pip install "fsrs[optimizer]==6.3.1"` but reproducibly pinned. torch installs
# the default host wheel (CPU on this Apple-silicon/macOS host — no CUDA extras).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$DIR/.venv"
REQ="$DIR/requirements.txt"

[ -f "$REQ" ] || { echo "setup-venv: $REQ missing" >&2; exit 1; }

# Fresh, deterministic venv (project-local; never the system interpreter's pip).
python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/pip" install -r "$REQ"

echo "setup-venv: ready -> $VENV/bin/python"
