# Task: wave22-03-ts-oracle-test

**Status:** done
**Driver:** auto
**Updated:** 2026-07-14
**Last compute:** mac-mini

ORACLE-AUTHORING (TS side) — write the SUSPENDED reference test `lib/elo.oracle.test.ts` that freezes
the wave22-01 python golden values and will bind once `lib/elo.ts` exists (task 04). The impl task may
NOT edit this file. Suspended so the suite stays green before the impl module exists.

Depends on: wave22-01 (golden values in `PREVERIFY-OUTPUT.txt`), wave22-02 (`ELO_*` constants).

## Goal
PASS = ALL true:

1. `lib/elo.oracle.test.ts` exists and TRANSCRIBES the frozen values from
   `tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt` (NOT computed from any TS impl) as literals,
   covering at minimum: the (a′) plain/guess contrast (`beta_plain=-0.2/theta=0.2`,
   `beta_g020=-0.16/theta=0.16`), the (a″) K-schedule points (`0.4`, `0.266667`, `0.036364`), the
   (b) 40-answer fold's final β/n for every item + θ/n for every user, and the (c) order-sensitivity
   pair.
2. The impl-dependent assertions live under a `describe.skip(...)` block that reaches the future impl
   via a dynamic `await import("./elo")` guarded on the line above by a `// @ts-expect-error` (module
   not present until task 04) — so typecheck stays green now.
3. The file also contains at least ONE NON-skipped test — an impl-INDEPENDENT self-consistency check of
   the FROZEN oracle numbers themselves (e.g. asserts `K(0)>K(10)>K(200)` on the transcribed literals,
   and that `abs(beta_g020) < abs(beta_plain)` — guess weakens evidence) — so `npx vitest list` keeps
   the file collected.
4. `npx vitest list` includes `elo.oracle` (captured to a var, token-checked with retry — never piped
   straight into grep).
5. `npm run -s typecheck` exits 0.
6. `npm test` exits 0 (the skipped block does not run; the self-consistency test passes).

## Constraints / decisions
- Literals come from the python oracle's captured stdout ONLY — never regenerate from TS.
- Use `describe.skip` (not `it.skip`) for the impl block; dynamic `import("./elo")` + one
  `// @ts-expect-error` on the import line keeps typecheck green (task 05 removes both the directive
  and the `.skip`).
- Do NOT write the literal token `describe.skip`/`.skip(` in PROSE comments beyond the one real use
  (keeps task 05's un-skip grep gate clean).
- Non-goal: no impl, no server code. This file is a frozen oracle only.

## Next
- [x] Author lib/elo.oracle.test.ts with the frozen literals + one non-skipped self-consistency test.
- Goal met. wave22-04 implements `lib/elo.ts`; wave22-05 un-skips this file (remove `describe.skip`
  + the four `// @ts-expect-error` import-line directives, static-import `./elo`).

## Log
- 2026-07-14T14:27Z ClPcs-Mac-mini — Authored `lib/elo.oracle.test.ts` mirroring the suspended-oracle
  pattern of `lib/readiness-seen-unseen.oracle.test.ts` (b6cabdf). Transcribed the frozen literals
  from `tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt` (NOT from any TS): (a″) K-schedule
  0.4/0.266667/0.036364, (a′) plain/guess −0.2/0.2 vs −0.16/0.16, (b) all 8 item β/n + 5 user θ/n on
  the 40-answer fold, (c) order-sensitivity pair 0.040006/−0.033619. Impl-binding assertions live under
  ONE `describe.skip(...)`, each reaching the future `./elo` via `await import("./elo")` guarded by a
  `// @ts-expect-error` on the line above (kFor/guessFloor, eloUpdate for g=0.2, foldEloStream items+
  users, reversed-stream order sensitivity). Rebuilt the fixed (b) stream in TS (`streamBSorted`:
  correct=(u+i)even, oc=4) so the skipped fold calls match. Four NON-skipped self-consistency tests
  grade the literals' internal relationships (K decreasing, |β_guess|<|β_plain|, symmetric
  ±update, n-conservation 8×5=5×8=40, reversed≠sorted) so `npx vitest list` keeps the file collected.
  Verified: typecheck 0, `npm test` 782 passed | 4 skipped (786), `npx vitest list` includes
  `elo.oracle` (4 entries), file run = 4 passed | 4 skipped.

## Artifacts
- `lib/elo.oracle.test.ts` — the frozen suspended oracle (impl-binding `describe.skip` block +
  4 non-skipped self-consistency tests).

## Verify
**Last verify:** PASS (2026-07-14T11:27:58Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:29:19Z)
