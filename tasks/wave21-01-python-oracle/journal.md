# Task: wave21-01-python-oracle

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Last compute:** ClPcs-Mac-mini

**Artifacts:** `scripts/oracles/gen-wave21-oracles.py` (the reference oracle),
`tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt` (captured stdout, static-judge evidence).

ORACLE-AUTHORING — the FIRST task of wave21; runs BEFORE any TypeScript. Deliverable: a committed,
network-free, stdlib-only (`import math` only) reference script
`scripts/oracles/gen-wave21-oracles.py` that reimplements — INDEPENDENTLY of the TS impl — the NEW
`computeStudyPlan` model from `specs/wave21-plan-honesty.md` and the server-side `reviewLoad`
estimator, and freezes properties (a)–(e). It also emits a verbatim `PREVERIFY-OUTPUT.txt`-style
stdout so the static evaluator READS a file rather than running anything.

Source of the model (frozen here; later tasks may NOT edit these values):
- `specs/wave21-plan-honesty.md` (Goal + "The model fix" + Deliverable 1 (a)–(e)).
- `docs/research/PLAN-REVALIDATION-2026-07-14.md` (the explosion fixture + the old-formula failure).

## The model (frozen here — re-encode, do NOT import the TS)
Constant `MAX_DAILY_QUOTA = 40`. `computeStudyPlan({examDate, todayKey, dueCount, unseenCount,
defaultGoal, reviewLoad})`:
- **examDate === null** → class `NODATE`: `daysLeft=null`, `quota=defaultGoal`, `feasible=true`.
- else `daysLeft = max(0, dayIndex(examDate) − dayIndex(todayKey))`.
- **daysLeft === 0** (exam today / overdue) → CURRENT semantics kept: `raw = unseenCount + dueCount`;
  `feasible = raw <= defaultGoal`; displayed `quota = min(raw, MAX_DAILY_QUOTA)` (clamp added);
  class `EXAM_TODAY_OK` if feasible else `EXAM_TODAY_OVER`. Uses `dueCount` (snapshot backlog), NOT
  reviewLoad.
- **daysLeft ≥ 1, unseenCount === 0** → class `MAINT` (caught-up maintenance, regardless of due):
  `quota = reviewLoad` (NOT clamped — may exceed MAX), `feasible=true`. Replaces the unreachable
  `workRemaining===0` branch as the real steady state.
- **daysLeft ≥ 1, unseenCount > 0**: `base = ceil(unseenCount / daysLeft) + reviewLoad`;
  `feasible = base <= MAX_DAILY_QUOTA`; if feasible class `PACE`, displayed `quota = base`; if
  infeasible class `PRIORITIZE`, displayed `quota = min(base, MAX_DAILY_QUOTA)` (= MAX_DAILY_QUOTA).
- **reviewLoad estimator** (server side): `reviewLoad = min(seenCount, round(sum over seen cards of
  1/max(1, stability)))` where `round` = `floor(x+0.5)` (matches JS `Math.round` for x≥0). Rationale:
  a card at stability S re-arrives ~1/S per day in steady state; cap at seen count.

## Goal
PASS = ALL true:

1. `scripts/oracles/gen-wave21-oracles.py` exists; `python3 scripts/oracles/gen-wave21-oracles.py`
   exits 0 using ONLY the stdlib (`math`); header NAMES `specs/wave21-plan-honesty.md` +
   `PLAN-REVALIDATION-2026-07-14.md` and states verbatim "reference oracle — the TS impl MUST match
   this; never regenerate these values from TS".
2. Script prints, and `verify.sh` captures into
   `tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt`, a labelled `ok <token> got=X exp=X`-style
   line for every frozen quantity in criteria 3–7, with header line "static evidence — read, do not
   run". No line contains `MISMATCH`/`not ok`/`FAIL:`.
3. **(a) quota/feasible/message-CLASS census** — the following fixtures reproduced EXACTLY (todayKey
   `2026-07-02`, examDate offsets give the stated daysLeft; class tokens NODATE/MAINT/PACE/PRIORITIZE/
   EXAM_TODAY_OK/EXAM_TODAY_OVER):
   - `nodate`  examDate=null,U=100,D=10,L=3,G=15 → class NODATE,  quota 15, feasible true, daysLeft null
   - `pace`    daysLeft=10,U=100,D=20,L=2,G=15   → class PACE,     quota 12, feasible true
   - `priori`  daysLeft=2, U=190,D=10,L=5,G=15   → class PRIORITIZE, quota 40 (clamp), feasible false
   - `maint`   daysLeft=10,U=0, D=50,L=8,G=15    → class MAINT,    quota 8,  feasible true
   - `explode` daysLeft=3, U=0, D=200,L=45,G=15  → class MAINT,    quota 45, feasible true
     (also print the OLD formula's `ceil((U+D)/daysLeft)=67` and its infeasible verdict as a
     `# documented, NOT asserted` comment — the pre-existing defect this wave fixes)
   - `today_ok`   daysLeft=0,U=5, D=5, G=15 → class EXAM_TODAY_OK,   quota 10, feasible true
   - `today_over` daysLeft=0,U=20,D=10,G=15 → class EXAM_TODAY_OVER, quota 30, feasible false
   - `today_clamp` daysLeft=0,U=50,D=100,G=15 → class EXAM_TODAY_OVER, quota 40 (clamp binds), feasible false
   - `fresh`   daysLeft=10,U=100,D=0,L=0,G=15 → class PACE, quota 10, feasible true; AND print the
     OLD formula value `ceil((100+0)/10)=10` and assert `new.quota == old` (fresh-user equality anchor)
   - `maint0`  daysLeft=5,U=0,D=0,L=0,G=15 → class MAINT, quota 0, feasible true (reviewLoad-0 edge)
4. **(b) clamp property** — `displayed quota ≤ MAX_DAILY_QUOTA (40)` holds for EVERY unseen>0-infeasible
   fixture AND every exam-today-overflow fixture; print `clamp.max_over_infeasible = 40 ≤ 40`. (The
   MAINT branch is intentionally EXEMPT — assert `explode.quota == 45 > 40` to prove maintenance is
   NOT clamped.)
5. **(c) monotonicity in daysLeft** — at fixed U=100, L=2, G=15, sweep daysLeft {1,2,5,10,20,100}:
   the RAW base `ceil(100/daysLeft)+2` = `102,52,22,12,7,3` (strictly decreasing) and the DISPLAYED
   quota = `40,40,22,12,7,3` (non-increasing); print both sequences and assert monotone.
6. **(d) reviewLoad estimator** — 6dp sums + rounded/capped values on fixed stability vectors:
   - `[1,2,4,10]`     → sum 1.850000 → reviewLoad 2
   - `[0.5,0.5,0.5]`  → sum 3.000000 → reviewLoad 3
   - `[50,50,50]`     → sum 0.060000 → reviewLoad 0
   - `[1,1,1,1,1]`    → sum 5.000000 → reviewLoad 5
   - `[2,3,7,20,100]` → sum 1.036190 → reviewLoad 1
   - `[0.1,0.1]`      → sum 2.000000 → reviewLoad 2 (cap==seen; sub-1 stability clamps to 1/day each)
7. **(e) boundary census** — print rows for daysLeft ∈ {0,1}, unseenCount 0, dueCount 0, reviewLoad 0,
   and the NODATE branch varying defaultGoal ∈ {5,15,30} (assert NODATE quota == defaultGoal, feasible
   true, daysLeft null for each — the no-date branch is UNCHANGED, regression-pinned).

## Constraints / decisions
- Independent reimplementation: the script must NOT import or shell out to any TS/JS. Expected values
  in later tasks come from THIS script, never from the TS impl (anti self-grading).
- `dayIndex(key)` = UTC day index of a `YYYY-MM-DD` key (`floor(Date.UTC-equivalent / 86400)`);
  reproduce the TS `dayIndex` deterministically (no live clock).
- `round` = `math.floor(x + 0.5)` so it matches JS `Math.round` for non-negative inputs (1.85→2,
  0.5→1, 1.036→1, 0.06→0). Document this in the script.
- No behavior change to any TS file in this task (script + captured output + journal only).

## Acceptance (static evidence — the evaluator READS these files; no execution needed)
| Goal criterion | Where confirmed (read, don't run) |
|---|---|
| 1. script exists, stdlib-only, header names sources + anti-self-grading | `scripts/oracles/gen-wave21-oracles.py` docstring; PREVERIFY tail `RESULT: ALL … PASSED` |
| 2. labelled ok-lines + static-evidence header, no MISMATCH | `PREVERIFY-OUTPUT.txt` line 1 `static evidence — read, do not run`; each line `ok <token> got=… exp=…` |
| 3. (a) class census incl. explosion + fresh equality | PREVERIFY `# (a)` block: `explode` class MAINT quota 45; `fresh` new==old==10; all 10 fixtures |
| 4. (b) clamp property | PREVERIFY `clamp.max_over_infeasible = 40`; `explode.quota = 45 > 40` (MAINT exempt) |
| 5. (c) monotonicity | PREVERIFY `monotone.base = 102 52 22 12 7 3` / `monotone.displayed = 40 40 22 12 7 3` |
| 6. (d) reviewLoad estimator 6dp | PREVERIFY `# (d)` block sums 1.850000/3.000000/0.060000/5.000000/1.036190/2.000000 → 2/3/0/5/1/2 |
| 7. (e) boundary + no-date regression pin | PREVERIFY `# (e)` block: NODATE quota==defaultGoal for {5,15,30} |

Every `exp` anchor is derived from the spec's model formulas; the script re-encodes them independently
and touches no TS. The evaluator confirms each criterion by READING the two produced files above.

## Next
- [x] Write `scripts/oracles/gen-wave21-oracles.py` (stdlib-only): encode computeStudyPlan class logic
      + reviewLoad estimator; emit labelled `ok …` lines for (a)–(e); run + capture to
      PREVERIFY-OUTPUT.txt; make verify.sh green.
- Goal fully met. Downstream: wave21-02 reads PREVERIFY-OUTPUT.txt to author the TS oracle test.

## Log
- 2026-07-14 planner: task scaffolded from spec Deliverable 1.
- 2026-07-14 ClPcs-Mac-mini: wrote `scripts/oracles/gen-wave21-oracles.py` (stdlib `math`+`sys` only,
  no TS import). Independently re-encoded the NEW computeStudyPlan model (NODATE/MAINT/PACE/PRIORITIZE/
  EXAM_TODAY_OK/EXAM_TODAY_OVER classes, MAX_DAILY_QUOTA=40 clamp on unseen>0-infeasible & exam-today,
  MAINT exempt) + reviewLoad estimator (`min(seen, jsround(Σ 1/max(1,S)))`, jsround=floor(x+0.5)).
  dayIndex reproduced via pure Hinnant days_from_civil/civil_from_days (no datetime, no live clock);
  add_days builds examDate from todayKey 2026-07-02 for the daysLeft fixtures. Froze (a) 10-fixture
  census incl. explosion (MAINT quota 45, old ceil((0+200)/3)=67 documented-not-asserted) + fresh
  new==old==10; (b) clamp max=40, explode 45>40 MAINT-exempt; (c) monotone base 102 52 22 12 7 3 /
  displayed 40 40 22 12 7 3; (d) reviewLoad 6dp sums incl. 1.036190→1; (e) boundary + NODATE regression
  pin. verify.sh green: 86/86 checks PASSED, PREVERIFY-OUTPUT.txt (132 lines) captured. Fixed a
  bool-vs-string `feasible` compare bug (compare the bool to a bool exp, not "True"/"False").

## Verify
**Last verify:** PASS (2026-07-14T07:15:53Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T07:17:39Z)
