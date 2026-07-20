# Task: wave7-03-content-key-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec B — a PURE, deterministic key-derivation module + unit tests. Pass = ALL true:
1. `lib/content-key.ts` exists and EXPORTS `questionKey(section: string, qnum: number): string` and
   `optionKey(questionKey: string, n: number): string`.
2. `questionKey("11", 7) === "q_11_7"`; `questionKey("8", 1) === "q_8_1"`; a sub-label section is normalized
   by replacing each `.` with `_` (documented in a header comment): `questionKey("8.1", 2) === "q_8_1_2"`.
3. `optionKey("q_11_7", 1) === "q_11_7__1"` (double underscore separator, 1-based `n`); `optionKey("q_8_1_2", 3)
   === "q_8_1_2__3"`.
4. PURITY: `lib/content-key.ts` contains NONE of the tokens `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated`, `Math.random`, `Date.now`, `new Date` (anywhere in the file, incl. comments — purity greps
   match the whole file). No imports of any DB/server module; no I/O.
5. `lib/content-key.test.ts` exists and asserts: the formats above; the dot-normalization; and INJECTIVITY —
   for a representative set of distinct `(section, qnum)` inputs (incl. the `8`/`8.1` ambiguity pair and a
   `12`-vs-`1.2` style pair) the produced `questionKey`s are all distinct, AND likewise distinct `optionKey`s
   for distinct `(questionKey, n)`.
6. `npm run typecheck` exits 0; `npm test` exits 0 and `npx vitest list` includes `lib/content-key.test.ts`.

## Constraints / decisions
- PURE module: no `server-only`/`@/lib/db`/`@prisma/client`/`lib/generated` imports, no `Math.random`/`Date.now`/
  `new Date`. Keep DB orchestration out (CLAUDE.md pure/server split). Do NOT write any forbidden literal token
  in doc comments either — the purity gate greps the whole file (bit wave1-sec-02).
- NORMALIZATION CHOICE (document in the file header): section is `\d+(\.\d+)*`; replace each `.` with `_`, then
  join `q`, the normalized section, and `qnum` with `_`. This is collision-free for distinct `(section, qnum)`
  because the LAST `_`-token is always `qnum` and the rest is the section — the split is deterministic, so the
  map is injective. The unit test must PROVE this (criterion 5), not just assert the happy path.
- Non-Goal: NO DB reads/writes, NO calling these from the loader (that is task 05), NO schema work. This module
  is data-in/string-out only.

## Plan
- [x] Write `lib/content-key.ts` (header doc of the normalization + injectivity argument; 2 exported fns).
- [x] Write `lib/content-key.test.ts` (formats, dot-normalization, injectivity over an ambiguity-prone set).
- [x] `npm run typecheck` + `npm test` (+ `npx vitest list` includes the new test).

## Done
- [x] `lib/content-key.ts` — pure `questionKey(section,qnum)`/`optionKey(questionKey,n)` with documented
  dot→underscore normalization + injectivity argument in the header. Purity grep clean (no forbidden tokens).
- [x] `lib/content-key.test.ts` — asserts the documented formats (`q_11_7`, `q_8_1`, `q_8_1_2`; `q_11_7__1`,
  `q_8_1_2__3`), dot-normalization, and INJECTIVITY (Set-size == input-count) over an ambiguity-prone set
  including `8`/`8.1` and `12`/`1.2` pairs, for both `questionKey` and `optionKey`. typecheck 0, 272 tests
  pass, `npx vitest list` includes the file, full `verify.sh` PASS.

## Next
- [ ] None — Goal fully met (verify.sh PASS). Downstream work (loader upsert/override use of these keys)
  lives in tasks wave7-04/05/06.

## Artifacts
- `lib/content-key.ts` — pure `questionKey`/`optionKey` derivation.
- `lib/content-key.test.ts` — format + injectivity unit tests.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: wrote `lib/content-key.ts` — pure `questionKey`/`optionKey` exports,
  header doc of the dot→underscore normalization + injectivity argument (qnum pinned as final `_`-token).
  Verified purity grep clean (no `server-only|@/lib/db|@prisma/client|lib/generated|Math.random|Date.now|new Date`).
  Next: the unit test.
- 2026-06-23T15:08Z ClPcs-Mac-mini: wrote `lib/content-key.test.ts` (mirrors `lib/sparkline.test.ts` style:
  vitest `describe/it`, `@/lib/content-key` alias import). Covers documented formats, dot-normalization, and
  injectivity via Set-size==input-count over an ambiguity-prone set (`8`/`8.1`, `12`/`1.2`) for both
  `questionKey` and `optionKey`. typecheck 0; 272 tests pass; `npx vitest list` includes the file; full
  `verify.sh` PASS. Status → done.


## Verify
**Last verify:** PASS (2026-06-23T12:09:21Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T12:10:50Z)
