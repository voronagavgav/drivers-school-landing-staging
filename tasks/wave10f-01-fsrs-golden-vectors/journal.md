# Task: wave10f-01-fsrs-golden-vectors

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-01
**Last compute:** laptop

## Goal
Create an EXTERNAL FSRS-5 golden-vector reference gate that drives OUR `schedule()` and asserts against
independently-generated numbers (from `ts-fsrs@5.4.1`, the last FSRS-5/19-weight release). This is the
keystone task; it is DELIBERATELY failing-guarded until wave10f-02 fixes the prior-difficulty bug.

Boolean acceptance criteria:
1. File `lib/fsrs/reference-vectors.test.ts` exists.
2. Its header comment names the source package + exact version (`ts-fsrs@5.4.1`) AND the config used to
   generate the vectors (`FSRS_DEFAULT_WEIGHTS`, `request_retention: 0.90`, `enable_short_term: false`).
3. The test vendors the reference S/D/interval numbers as plain numeric LITERALS (no runtime import of
   `ts-fsrs`): `grep -q "ts-fsrs" lib/fsrs/reference-vectors.test.ts` is true AND
   `grep -Eq "(import|require).*ts-fsrs" lib/fsrs/reference-vectors.test.ts` is FALSE (name appears only
   in the comment, not as a dependency).
4. `ts-fsrs` is NOT added to the repo's `package.json` (`grep -q ts-fsrs package.json` is false); the
   scratch generation dir is outside the repo and deleted.
5. The test covers ≥4 grade sequences (e.g. G,G,G,G · G,A,G,G · E,E,E · H,G,A,H,G) at fixed inter-review
   gaps, driving OUR `schedule()` and asserting `stability`/`difficulty` via `toBeCloseTo` (tolerance
   ≤1e-4) and `intervalDays` (or the derived integer interval) exactly.
6. `npx vitest list` output includes `reference-vectors` (proof the file is collected). Capture to a var
   first (`x="$(npx vitest list || true)"; echo "$x" | grep -q reference-vectors`) to avoid SIGPIPE.
7. `npm run typecheck` exits 0.
8. This task does NOT require the new test to PASS. `it.todo`/`test.skip` are FORBIDDEN — the test is
   real and currently RED against the B1 bug; wave10f-02 flips it green and folds it into `npm test`.

## Constraints / decisions
- Two-step guard (documented in both this journal and wave10f-02): the reference test is authored RED
  here; wave10f-02's fix makes it pass and adds it to the `npm test` green gate. Do NOT weaken tolerances
  or edit `schedule()` here to force green — that defeats the external gate.
- Generate vectors with ts-fsrs configured for the LONG-TERM variant (`enable_short_term: false`) — we
  ship that variant; the short-term w17/w18 terms are deliberately unused.
- Non-Goal: any code change under `lib/fsrs/` other than the new test file. No new repo dependency.
- Purity gate still applies to the whole `lib/fsrs/` tree, but a `*.test.ts` is not a pure module — it may
  import `@/lib/fsrs`. Keep vendored numbers as literals so there is no ts-fsrs runtime coupling.

## Plan
- [x] In a throwaway scratch dir OUTSIDE the repo: `npm i ts-fsrs@5.4.1`; configure with our defaults;
      script it to emit S/D/interval per step for the ≥4 sequences at the fixed gaps.
- [x] Vendor the emitted numbers as literals into `lib/fsrs/reference-vectors.test.ts` with a source header.
- [x] Wire the test to drive OUR `schedule()` through the identical sequences/gaps and assert closeness.
- [x] Confirm `npx vitest list` lists it and `npm run typecheck` is 0; delete the scratch dir.

## Next
- [ ] (none — Goal met) wave10f-02 flips this RED gate green and folds it into `npm test`.

## Log
- 2026-07-01 laptop: Planned. Keystone external gate; authored RED, greened by wave10f-02.
- 2026-07-01 ClPcs-Mac-mini: Generated golden vectors in `/tmp/fsrs-golden` (ts-fsrs@5.4.1, w=FSRS_DEFAULT_WEIGHTS,
  request_retention 0.90, enable_short_term:false, fuzz off; fixed 10-day gap, 4 sequences GGGG/GAGG/EEE/HGAHG).
  ts-fsrs 5.4.1 auto-migrates 19→21 weights (appends w19=0, w20=0.5 → decay -0.5) which reproduces FSRS-5 with
  short-term disabled — verified step-1 (new-card) S/D matches our engine exactly (e.g. first Good S=3.173,
  D=5.28243442). Vendored S/D/interval as literals into `lib/fsrs/reference-vectors.test.ts` driving OUR
  `schedule()`; interval oracle = round(intervalDays(S,0.90)) NOT ts-fsrs scheduled_days (ts-fsrs bumps a first
  Hard to 2 for cross-grade ordering our pure long-term engine intentionally omits — documented in the header).
  All acceptance criteria pass: typecheck 0, `npx vitest list` includes reference-vectors, ts-fsrs NOT in
  package.json, named-but-not-imported, no it.todo/skip. Test is RED now (4 failed — difficulty matches, stability
  diverges from step 2 via the B1 prior-difficulty bug), greened by wave10f-02. Scratch dir deleted. Status→done.


## Verify
**Last verify:** PASS (2026-07-01T20:19:07Z)

## Evaluation
**Last evaluation:** PASS (2026-07-01T20:20:34Z)
