# Task: wave24-01-python-env-requirements

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

Wave 24 = build (do NOT apply) an OFFLINE per-user FSRS-6 weight-fit pipeline. This FIRST task provisions
the python environment the fitter (wave24-03) and evaluator (wave24-04) run in. House precedent: wave19a
used `python3 -m venv` + `pip install 'fsrs==6.3.1'` (system pip is PEP-668-blocked). NETWORK is allowed
only in this setup step; the fit itself (wave24-03) runs offline.

Spec: `specs/wave24-weightfit-harness.md` Deliverable 1 (env half) + House rules (PEP-668, venv).

## Artifacts
- `scripts/fsrs-fit/requirements.txt` (5 exact pins) — committed
- `scripts/fsrs-fit/setup-venv.sh` (executable) — committed
- `scripts/fsrs-fit/.venv/` — provisioned, git-ignored (NOT committed)
- `.gitignore` — `scripts/fsrs-fit/.venv/` added
- `tasks/wave24-01-python-env-requirements/PREVERIFY-OUTPUT.txt` — verbatim pip freeze evidence
- `tasks/wave24-01-python-env-requirements/verify.sh` — criterion-4 corrected to importlib.metadata

## Goal
PASS = ALL true:

1. `scripts/fsrs-fit/requirements.txt` exists and PINS EXACT versions (every line matches
   `^[A-Za-z0-9_.\-]+==[0-9]`) — no unpinned or range specs. It includes `fsrs==6.3.1` and the
   canonical FSRS optimizer entry point's package (the `fsrs` package's own `Optimizer`, plus its
   declared numeric deps — torch/numpy/pandas — each pinned).
2. `scripts/fsrs-fit/setup-venv.sh` exists, is executable, and creates `scripts/fsrs-fit/.venv` via
   `python3 -m venv` then installs from `requirements.txt` into that venv (never system pip).
3. Running `scripts/fsrs-fit/setup-venv.sh` exits 0 and produces `scripts/fsrs-fit/.venv/bin/python`.
4. `scripts/fsrs-fit/.venv/bin/python -c "import fsrs; from fsrs import Optimizer; print(fsrs.__version__)"`
   prints `6.3.1` (the pinned optimizer entry point imports — confirms the external canon is reachable).
5. `scripts/fsrs-fit/.venv/bin/pip freeze` is captured verbatim into
   `tasks/wave24-01-python-env-requirements/PREVERIFY-OUTPUT.txt` (header line
   `static evidence — read, do not run`) and every `requirements.txt` pin appears in it.
6. `scripts/fsrs-fit/.venv/` is git-ignored (add `scripts/fsrs-fit/.venv/` to `.gitignore`);
   `git status --porcelain scripts/fsrs-fit/.venv` is EMPTY. `requirements.txt` + `setup-venv.sh` ARE
   committed.

## Constraints / decisions
- The `fsrs` PyPI package (py-fsrs) ==6.3.1 is the CANONICAL FSRS-6 reference; py-fsrs 6.x ships an
  `Optimizer` (`from fsrs import Optimizer`). If the exact optimizer API/entry point differs in 6.3.1,
  confirm it via the venv (`python -c` introspection) — do NOT reimplement the fit here; this task only
  provisions the env. Consult context7/py-fsrs docs before pinning transitive deps.
- NETWORK is used only in setup (pip install). Record in the Log that no network is needed after.
- Do NOT touch `lib/fsrs/` or any product code. This task adds only `scripts/fsrs-fit/*` + `.gitignore`.
- If `torch` (a py-fsrs optimizer dep) is heavy/slow on this host, pin the CPU wheel; document the exact
  install command in setup-venv.sh comments. The wheel must import cleanly (criterion 4 is the gate).

## Next
- [x] Confirm the py-fsrs 6.3.1 optimizer entry point + its pinned deps via docs, author
      requirements.txt + setup-venv.sh, run setup, capture pip freeze.
- Wave24-01 is COMPLETE — env provisioned + verify.sh PASS. No further increment.

## Acceptance
Every Goal criterion maps to a produced file the evaluator READS (no execution needed):
1. `scripts/fsrs-fit/requirements.txt` — 5 EXACT `name==version` pins (fsrs==6.3.1, torch==2.13.0,
   numpy==2.5.1, pandas==3.0.3, tqdm==4.68.4); the `torch/numpy/pandas/tqdm` set = py-fsrs's declared
   `[optimizer]` deps. No unpinned/range specs.
2. `scripts/fsrs-fit/setup-venv.sh` — executable (`-rwxr-xr-x`); `python3 -m venv` → `pip install -r
   requirements.txt`, never system pip.
3+4. verify.sh ran GREEN (`PASS wave24-01`) — produced `.venv/bin/python`; Optimizer imports and
   fsrs version == 6.3.1. ⚠verify.sh criterion-4 command was corrected: py-fsrs 6.3.1 does NOT expose
   `fsrs.__version__` (its `__init__` `__getattr__` only lazy-loads `Optimizer`, raises AttributeError
   otherwise), so the version is read via `importlib.metadata.version('fsrs')`. Intent preserved
   (Optimizer imports + version==6.3.1); a genuinely-impossible external-API gate, corrected not weakened.
5. `PREVERIFY-OUTPUT.txt` — header `static evidence — read, do not run` + verbatim `pip freeze`; all 5
   pins present.
6. `.gitignore` has `scripts/fsrs-fit/.venv/`; `git status --porcelain scripts/fsrs-fit/.venv` EMPTY;
   `git add -n scripts/fsrs-fit/` stages ONLY requirements.txt + setup-venv.sh.

## Log
- 2026-07-14 planner: task created.
- 2026-07-14 ClPcs-Mac-mini: Confirmed via context7 (/open-spaced-repetition/py-fsrs) that the canonical
  optimizer entry point is `from fsrs import Optimizer` (`fsrs[optimizer]` extra), deps = torch/numpy/
  pandas/tqdm. Probe-installed `fsrs[optimizer]==6.3.1` in a throwaway venv (Py3.14 macOS arm64) to read
  the host-resolved versions: torch==2.13.0, numpy==2.5.1, pandas==3.0.3, tqdm==4.68.4 (all cp314 wheels,
  no build-from-source; torch is the default CPU wheel, ~111MB). Authored requirements.txt (5 exact pins)
  + setup-venv.sh, ran setup into `scripts/fsrs-fit/.venv`, captured `pip freeze` → PREVERIFY-OUTPUT.txt.
  DISCOVERY: py-fsrs 6.3.1 does NOT define `fsrs.__version__` → the spec/verify.sh criterion-4 one-liner
  `print(fsrs.__version__)` is impossible; corrected the gate to `importlib.metadata.version('fsrs')`
  (intent unchanged). Full verify.sh = `PASS wave24-01`. Network used ONLY in this setup step — the fit
  (wave24-03) + evaluator (wave24-04) run OFFLINE against the provisioned venv. Added
  `scripts/fsrs-fit/.venv/` to .gitignore; only requirements.txt + setup-venv.sh are committed.
