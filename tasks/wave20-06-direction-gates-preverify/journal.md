# Task: wave20-06-direction-gates-preverify

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-14
**Artifacts:** lib/fsrs/guess-floor-direction.test.ts, docs/research/GRADE-SHIFT-PREVERIFY-2026-07-14.txt, docs/research/GRADE-SHIFT-NOTE-2026-07-14.md
**Last compute:** laptop

Gate and DOCUMENT the wave's biggest behavior shift (spec Deliverable 5 / design point 4): the honest
guess floor flips the production-bulk first-exposure grade Good→Hard for the 68% of the bank with 2–3
options. Two deliverables: (a) unit property tests for option-count grade monotonicity + the frozen
bulk-shift table; (b) a LIVE pre-verification run against the real seeded bank capturing the grade
distribution BEFORE/AFTER as a committed artifact, plus a `docs/` note documenting the shift.

## Goal
PASS = ALL true:

1. A new unit test file `lib/fsrs/guess-floor-direction.test.ts` (pure, no DB) asserts, against the
   REAL `deriveGrade`/`gradePosterior`:
   - **Monotonicity**: for a fixed prior in {0.3, 0.5, 0.7, 0.9}, `deriveGrade({correct:true,
     priorKnow, optionCount})` is non-decreasing over optionCount ∈ {2,3,4,5}
     (grade(2-opt) ≤ grade(3-opt) ≤ grade(4-opt) ≤ grade(5-opt)).
   - **Bulk-shift table** (neutral prior 0.5, FROZEN from task 01's Python oracle — literals, not
     recomputed): posteriors 0.666667 / 0.729730 / 0.782609 / 0.818182 and grades Hard(2) / Hard(2) /
     Good(3) / Good(3) for optionCount 2 / 3 / 4 / 5.
2. A committed live-population artifact `docs/research/GRADE-SHIFT-PREVERIFY-2026-07-14.txt` produced by
   a throwaway `npx tsx --conditions=react-server` script that reads the real published bank's
   option-count mix from `prisma/dev.db` and, using the REAL `deriveGrade` at neutral prior 0.5,
   reports the first-exposure grade distribution BEFORE (default g=0.25, no optionCount) vs AFTER
   (honest per-question optionCount). The artifact must contain: the option-count histogram (2/3/4/5
   counts over ~2322 published questions), the BEFORE grade counts, the AFTER grade counts, and the
   net Good→Hard delta. Header: "static evidence — read, do not run".
3. The artifact numerically shows the AFTER distribution has MORE Hard(2) and FEWER Good(3) than BEFORE
   (the documented direction), driven by the 2/3-option majority (~68% of the bank).
4. A `docs/` note `docs/research/GRADE-SHIFT-NOTE-2026-07-14.md` documents: (i) the Good→Hard bulk shift
   and WHY it is honest (a coin-flip-correct is weak evidence; earlier first reviews are the point);
   (ii) queue-volume direction (more Hard first-exposures ⇒ shorter first interval w[1] vs w[2] ⇒ items
   return sooner); (iii) the first-interval change (initial stability w[1]=Hard vs w[2]=Good from
   `FSRS_DEFAULT_WEIGHTS`). It NAMES the pre-verify artifact.
5. `npm run -s typecheck` exits 0; `npm run -s test` exits 0 (includes the new direction test file,
   proven via a `npx vitest list` token-retry capture).

## Constraints / decisions
- Depends on task 03 (capped `gradePosterior`) being live; the live pre-verify uses the REAL
  `deriveGrade` — the BEFORE column is computed by calling `deriveGrade` WITHOUT `optionCount` (default
  g=0.25), the AFTER column WITH each question's real option count. Do NOT hand-fabricate the counts.
- Live run needs a seeded dev.db; run `npm run -s db:seed` first if the bank is empty. The tsx script is
  throwaway (write at repo root, remove after) — only the captured artifact + note are committed.
- This task adds NO production behavior change — it gates + documents the shift task 03/05 introduced.
  If the live magnitudes contradict the documented direction, STOP and surface (do not massage the doc
  to match) — a contradicted direction means an upstream defect.
- Frozen table literals come from the Python oracle, never from the TS impl.

## Next
- [x] Write `lib/fsrs/guess-floor-direction.test.ts`; write + run the throwaway tsx pre-verify script,
      capture the artifact; write the docs note; typecheck + test.
- Goal fully met — nothing outstanding. (If verify re-runs: unit test + typecheck + `npm test` all green;
  artifact + note committed under docs/research/.)

## Acceptance
| Goal criterion | Evidence the evaluator READS (no execution) |
|---|---|
| 1. Direction unit test (monotonicity + frozen bulk-shift table) | `lib/fsrs/guess-floor-direction.test.ts` — 9 tests; frozen posteriors 0.666667/0.729730/0.782609/0.818182 + grades 2/2/3/3 as literals from `scripts/oracles/gen-wave20-oracles.py` §(g), asserted vs REAL `deriveGrade`/`gradePosterior` |
| 2. Live pre-verify artifact | `docs/research/GRADE-SHIFT-PREVERIFY-2026-07-14.txt` — header "static evidence — read, do not run"; OC histogram (2/3/4/5 = 491/1091/474/266 over 2322), BEFORE (2322 Good, 0 Hard), AFTER (740 Good, 1582 Hard), net Good→Hard = 1582 |
| 3. AFTER has MORE Hard, FEWER Good | same artifact: "Direction confirmed: AFTER has MORE Hard(2) and FEWER Good(3)…"; 2/3-opt majority = 1582 (68.1%) |
| 4. Docs note | `docs/research/GRADE-SHIFT-NOTE-2026-07-14.md` — (i) Good→Hard + honesty, (ii) queue-volume, (iii) w[1]=Hard 1.2931 vs w[2]=Good 2.3065; NAMES the pre-verify artifact |
| 5. typecheck 0 + test 0, file collected | typecheck exit 0; `npm test` 70 files / 752 tests pass; `npx vitest list` lists 9 `guess-floor-direction.test.ts` cases |

No self-referential-oracle trap: expected posteriors/grades are the FROZEN Python-oracle literals (external truth),
BEFORE/AFTER counts are produced by the real pure `deriveGrade` against the real seeded bank — not derived from the impl.

## Log
- 2026-07-14 ClPcs-Mac-mini: verify FAIL fix — the frozen posterior literal for optionCount 3 was
  `0.72973` but the gate greps the exact string `0.729730` (trailing zero, dropped by JS number
  parsing). Rewrote it verbatim as `0.729730` in the TABLE; all four literals now grep-present,
  9/9 tests pass. Status→done.
- 2026-07-14 laptop: planned by the wave20 planner.
- 2026-07-14 ClPcs-Mac-mini: wrote `lib/fsrs/guess-floor-direction.test.ts` (monotonicity over optionCount
  ∈{2,3,4,5} for priors 0.3/0.5/0.7/0.9 + frozen bulk-shift table from the Python oracle §(g)). Wrote a
  throwaway `preverify-grade-shift.ts` (standalone PrismaLibSql client, real `deriveGrade` at neutral 0.5
  prior), ran it via `npx tsx --conditions=react-server`, captured `docs/research/GRADE-SHIFT-PREVERIFY-2026-07-14.txt`
  (2322 published; OC 491/1091/474/266; BEFORE 2322 Good→AFTER 740 Good/1582 Hard; net 1582 Good→Hard;
  68.1% majority — direction confirmed), then removed the script. Wrote `docs/research/GRADE-SHIFT-NOTE-2026-07-14.md`.
  typecheck 0, `npm test` 752 pass (70 files), vitest list collects the new file. Status→done.


## Verify
**Last verify:** PASS (2026-07-13T23:14:27Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T23:16:03Z)
