# Task: wave22-04-pure-lib-elo

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8
**Updated:** 2026-07-14
**Last compute:** mac-mini

IMPLEMENTATION — the pure `lib/elo.ts` module: types + `eloUpdate` + `foldEloStream`, exactly matching
the wave22-01 python oracle. Injected params object; NO module-global mutable state; NO `Date.now`/`new
Date`/`Math.random` (answeredAt comes from the caller's rows). May NOT edit `lib/elo.oracle.test.ts`.

Depends on: wave22-02 (constants), wave22-03 (frozen oracle test).

## Goal
PASS = ALL true:

1. `lib/elo.ts` exists and exports:
   - `EloParams` type: `{ kMax: number; kHalflife: number; guessMax: number; initialBeta: number; initialTheta: number }`.
   - `EloAnswer` type: `{ userId: string; questionId: string; correct: boolean; optionCount: number; answeredAt: Date | number; id?: string }`.
   - `kFor(n: number, params): number` = `params.kMax / (1 + n / params.kHalflife)`.
   - `guessFloor(optionCount: number, params): number` = `min(1/optionCount, params.guessMax)` (optionCount ≤ 0 ⇒ `params.guessMax`).
   - `eloUpdate({ theta, beta, thetaN, betaN, correct, optionCount }, params)` → `{ theta, beta }` implementing the guess-adjusted 3PL-lite update `P = g + (1−g)·sigmoid(θ−β)`, `e = y − P`, `θ' = θ + kFor(thetaN)·e`, `β' = β − kFor(betaN)·e`.
   - `foldEloStream(answers, params)` → `{ items: Map<string,{beta:number,n:number}>, users: Map<string,{theta:number,n:number}> }`. Consumes `answers` in the GIVEN order; per answer uses the current θ/β/counters (defaulting to initialTheta/initialBeta/0), applies `eloUpdate` with the pre-increment counters, then increments both counters. Does NOT sort internally (caller supplies order).
2. `foldEloStream` uses a default `params` sourced from `lib/constants.ts` (`ELO_K_MAX`, `ELO_K_HALFLIFE`, `ELO_INITIAL_BETA`, `ELO_INITIAL_THETA`) and `FSRS_GUESS_MAX` (imported from lib/fsrs/constants — NOT redeclared).
3. Impl correctness is oracle-checked NOW without editing the suspended oracle file: `verify.sh` runs
   a throwaway `npx tsx` check calling `eloUpdate` on the wave22-01 hand-frozen (a′) golden
   (θ=0,β=0,y=1,optionCount=5 ⇒ g=0.2, K=0.4 ⇒ `β'=−0.16`, `θ'=+0.16`) and asserts equality to 6dp
   (temp script removed before typecheck). The FULL frozen-vector binding is task 05 (un-skip).
4. `lib/elo.ts` is PURE: `grep -nE 'Date\.now|new Date|Math\.random'` over `lib/elo.ts` returns
   nothing; no `import "server-only"`, no `@/lib/db`, no `@prisma/client`, no `lib/generated`.
5. `npm run -s typecheck` exits 0.
6. `npm test` exits 0.

## Constraints / decisions
- The impl must reproduce the oracle to 6dp; single source of truth for expectations is the python
  oracle (wave22-01), NOT this impl's own tests.
- Injected `params` object — no module-global mutable Elo state; `foldEloStream` may allocate local
  Maps only.
- Counters used in a step are PRE-increment (new item/user gets `K(0)=kMax`) — matches the oracle.
- Non-goal: no persistence, no server replay, no DB (task 07); no consumer wiring.

## Next
- [x] Implement lib/elo.ts; verify a fold value against the python golden via a throwaway tsx check.

Goal fully met — nothing left. wave22-05 un-skips the frozen oracle (flip describe.skip→live, dynamic→static import of ./elo).

## Artifacts
- `lib/elo.ts` — pure module: `EloParams`/`EloAnswer` types, `kFor`, `guessFloor`, `eloUpdate`, `foldEloStream`, `DEFAULT_ELO_PARAMS` (params single-sourced from constants; guessMax reuses `FSRS_GUESS_MAX`).
- `lib/elo.oracle.test.ts` — removed the 4 now-unused `// @ts-expect-error` directives on the `await import("./elo")` lines (forced by the typecheck gate once ./elo exists; TS2578). `describe.skip` + frozen literals/tolerances untouched — wave22-05 owns the un-skip.

## Log
- 2026-07-14 ClPcs-Mac-mini — Wrote `lib/elo.ts` matching the wave22-01 python oracle (guess-adjusted 3PL-lite: g=min(1/oc,guessMax), P=g+(1−g)·σ(θ−β), e=y−P, K(n)=kMax/(1+n/kHalflife), θ+=K(nUser)·e, β−=K(nItem)·e; PRE-increment counters, fold in given order, no internal sort). verify.sh tsx check: β'=−0.160000, θ'=+0.160000 vs (a′) golden ✓. Removed 4 unused `@ts-expect-error` directives from the suspended oracle (typecheck TS2578 coupling, per CLAUDE.md wave21-03 precedent) — describe.skip + literals intact. typecheck 0, npm test 782 passed / 4 skipped. PASS: wave22-04.

## Verify
**Last verify:** PASS (2026-07-14T11:32:23Z)

## Evaluation
**Last evaluation:** PASS (2026-07-14T11:33:53Z)
