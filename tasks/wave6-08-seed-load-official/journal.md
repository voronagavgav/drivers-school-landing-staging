# Task: wave6-08-seed-load-official

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** laptop

## Goal
Spec F (part 1) — `db:seed` auto-loads official content, idempotently, reusing the importer. Pass = all true:
1. `npm run db:seed` loads BOTH the demo scaffold AND the official content in one run: after seeding, the DB
   has ≥1000 published OFFICIAL questions (`sourceType=OFFICIAL`, `isDemo=false`) WITH `imageKey` set on the
   image-bearing ones, AND still ≥24 published demo questions.
2. The official load REUSES the importer logic (do NOT fork a second copy of the import code). Acceptable:
   refactor `scripts/import-official.ts` to export an `importOfficial(prisma)` (guarding its CLI
   `main()`/auto-run so `import`ing it does not double-execute) and call it from `prisma/seed.ts`; OR have
   seed invoke the importer as a child process. Whichever — there is ONE import implementation.
3. `npm run db:seed` prints a line reporting the official count (e.g. `official: N questions`) and the demo
   count; both numbers are parseable for verify.sh.
4. Re-running `npm run db:seed` is idempotent: second run exits 0 and yields the SAME official + demo counts
   (no dup rows, no unique-constraint errors).
5. `lib/server/seed-content.integration.test.ts` is updated so it still passes WITH official content present:
   its per-question `isDemo`/`sourceType=DEMO` assertion is SCOPED to the demo subset (filter
   `where: { isDemo: true }`), asserting ≥24 published demo questions each one-correct + `sourceType=DEMO`.
   The one-correct invariant may stay asserted across ALL published questions (official included). It should
   ALSO assert ≥1 published `sourceType=OFFICIAL` question now exists.
6. `npm run typecheck` exits 0; `npm run test:integration` exits 0 with ZERO failures (seed-content +
   demo-retired + all other suites still green).

## Constraints / decisions
- **Evaluate: yes** — seeding now mutates the canonical content for every learner and must (a) stay
  idempotent and (b) preserve the demo invariant the whole test-suite leans on. Judge confirms re-seed
  parity and that the demo subset still satisfies ≥24 published / one-correct / DEMO.
- Requires the importer to already set `imageKey` and not write a served `imageUrl` (wave6-06) — order after it.
- Official load depends on `.content-import/import_plan.json` + images existing locally (gitignored). If the
  plan file is ABSENT in the run environment, seed must FAIL LOUDLY (non-zero) rather than silently seeding
  demo-only — the wave6 acceptance gate needs ≥1000 official.
- `prisma/seed.ts` runs under `tsx` with its own PrismaClient — the importer it reuses must NOT import
  `lib/db` (it already uses its own client; keep it that way).
- Do NOT retire the demo topics here — that is wave6-09. This task only ADDS official + fixes the invariant test.

## Plan
- [x] Refactor `scripts/import-official.ts` to export `importOfficial(prisma)` and guard CLI auto-run.
- [x] Call `importOfficial` from `prisma/seed.ts` after the demo seed; print official + demo counts.
- [x] Scope `seed-content.integration.test.ts` demo assertions to `isDemo:true`; assert official exists.
- [x] Seed twice for idempotency; run `test:integration`; typecheck.

## Done
- [x] Scoped `lib/server/seed-content.integration.test.ts` to the demo subset (Goal item 5): split the
      single test into three `it`s under `describe("seeded content invariants")` — (a) one-correct
      across ALL published, (b) ≥24 published DEMO via `where: { isPublished: true, isDemo: true }` each
      `isDemo===true`+`sourceType==="DEMO"`, (c) `prisma.question.count({where:{isPublished:true,
      sourceType:"OFFICIAL"}}) >= 1`. Grep gates satisfied (literal `isDemo: true` + `OFFICIAL`).
      VERIFIED: typecheck 0; `npm run test:integration` → 19 files / 67 tests passed (seed-content +
      demo-retired + all suites green WITH 1691 official rows in the dev DB); re-seed shows official:1691.
- [x] Exported `importOfficial(prisma)` from `scripts/import-official.ts` (takes the caller's
      PrismaClient). Removed the module-level client + auto-run; both now live behind a CLI guard
      (`process.argv[1]?.endsWith("import-official.ts")`, matching `scripts/iso-diagram.mjs` style).
      Verified: typecheck 0; importing the module does NOT auto-run; CLI path still creates its own
      client + disconnects.
- [x] Wired `importOfficial(prisma)` into `prisma/seed.ts`: static `import { importOfficial }`
      (safe — CLI guard means importing it does NOT auto-run; module top-level only existsSync-guarded
      reads), called at the END of `main()` after the demo categories/topics/questions/users exist,
      reusing seed's own client. Prints an explicit parseable `official: ${count} questions` line
      (published OFFICIAL count). Importer throws on missing `import_plan.json` → seed FAILS LOUDLY.
      VERIFIED LIVE: typecheck 0; `npm run db:seed` → `imported 1691 official questions in 63 topics`
      + `official: 1691 questions` + `Done. 25 demo questions`; verify's `offN()`=1691 (≥1000),
      `demoN()`=25 (≥24); re-ran seed → same OFF=1691 (idempotent at count level).

## Next
- [x] DONE — Goal fully met. All verify gates green: importer exported+reused, seed loads official
      (1691≥1000)+demo(25≥24) idempotently, seed-content test scoped to `isDemo:true` demo subset +
      asserts published OFFICIAL exists, typecheck 0, `test:integration` 67/67 green.
      If the driver's re-run of verify.sh ever goes red, re-seed first (dev DB needs official content
      present for the new OFFICIAL-exists assertion) then re-check.

## Artifacts
- prisma/seed.ts — now loads official too
- scripts/import-official.ts — exported reusable importer
- lib/server/seed-content.integration.test.ts — invariant scoped to demo subset

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23T00:00Z ClPcs-Mac-mini: refactored `scripts/import-official.ts` — `main()` → exported
  `importOfficial(prisma: PrismaClient)`; moved DB-url/client + `.then/.catch` runner into a CLI
  guard so `import`ing the module no longer double-executes. Typecheck 0; smoke-imported the module
  (logs only the import marker, no importer side effects); function is exported. seed.ts not yet
  wired (next increment) so the full verify.sh gate is still expected red until that lands.
- 2026-06-23T11:10Z ClPcs-Mac-mini: FIXED the verify FAIL (`seed.ts does not call importOfficial`) —
  wired the importer into `prisma/seed.ts`: added `import { importOfficial } from "../scripts/import-official"`
  and called `await importOfficial(prisma)` at the end of `main()` (after demo content exists, reusing
  seed's own client), then logged `official: ${count} questions` (published OFFICIAL count). VERIFIED
  LIVE: typecheck 0; `npm run db:seed` loads demo(25)+official(1691); offN()=1691≥1000, demoN()=25≥24;
  re-seed → same official count (idempotent). Gate still expected red at the NEXT check (seed-content
  test not yet scoped to `isDemo:true` / no `OFFICIAL` assert — that's the next increment).
- 2026-06-23T13:21Z ClPcs-Mac-mini: FIXED the verify FAIL (`seed-content test does not scope demo
  assertions with isDemo:true`) — rewrote `lib/server/seed-content.integration.test.ts` into three
  `it`s: (a) one-correct invariant across ALL published; (b) demo subset `where:{isPublished:true,
  isDemo:true}` ≥24 each DEMO; (c) `question.count({where:{isPublished:true,sourceType:"OFFICIAL"}})>=1`.
  Both grep gates satisfied (literal `isDemo: true` + `OFFICIAL`). VERIFIED LIVE: re-seeded
  (official 1691 + demo); typecheck 0; `npm run test:integration` → 19 files / 67 tests all passed.
  Goal fully met → Status: done.



## Verify
**Last verify:** PASS (2026-06-23T10:22:42Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T10:25:09Z)
