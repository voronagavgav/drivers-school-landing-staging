# Task: wave19b-07-blueprint-server-integration

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-12
**Last compute:** laptop

SERVER WIRING + INTEGRATION for the blueprint bucketing fix (Wave 19b deliverable #3). Route the two server
callers of `groupCandidatesByBlock` through the explicit-section bucketing from task 06, and un-skip / rewrite
the exam-blueprint integration test so it actually runs against the live seed — proving both the exam
composition AND the readiness p-vector now bucket correctly.

## Goal
PASS = ALL true:

1. `lib/server/mastery-readiness.ts` `recomputeReadiness` builds its per-block vector by passing
   `{ id, section: sectionFromQuestionKey(q.questionKey) }` to `groupCandidatesByBlock` (selecting
   `questionKey` in the question query), NOT `displayOrder`.
2. The `test-engine.ts` EXAM_SIMULATION blueprint composer likewise buckets candidates by
   `sectionFromQuestionKey(questionKey)` (selecting `questionKey`), NOT `displayOrder`.
3. `lib/server/exam-blueprint.integration.test.ts` is UN-SKIPPED for a normally-seeded dev.db (the demo-only
   guard may remain, but a `db:seed`'d DB — which imports official content — MUST run the real assertions, not
   skip). It asserts a cat-B `EXAM_SIMULATION` returns exactly `DEFAULT_EXAM_QUESTION_COUNT` questions
   distributed across the blueprint blocks WITHIN SPEC (structure 2 / medicine 2 / law 2 / general 1 / safety
   2–3 / pdr remainder), verified by mapping the returned questions' `questionKey`→section→block. The PIN
   section→title anchors are rewritten to the LIVE reality (§31→ТЕХНІЧНИЙ СТАН at displayOrder 132, §33→ДОРОЖНІ
   ЗНАКИ at 134) — NOT the false `section+99`.
4. REAL-SEED DIRECTIONAL ORACLE (new integration test): drive a throwaway user STRONG in signs (§33, all-
   correct via a `TOPIC_PRACTICE` on the signs topic) and WEAK in the mandatory small blocks (structure/
   medicine/law/safety topics, all-wrong), then `recomputeReadiness`. Assert on the persisted snapshot:
   (a) `inputsJson.blocks` routes signs correctly — the `pdr` remainder block (which holds §33) has
   `meanProb ≥ 0.8` while at least one small block has `meanProb ≤ 0.3`; (b) the heterogeneous
   `passProbability` is STRICTLY LESS than the homogeneous fallback computed from the SAME seen retrievabilities
   via `computeReadiness` with NO blocks (concentrated weakness in fixed-quota blocks is not averaged away).
5. `npm run -s typecheck` exits 0; `npm run -s test:integration` exits 0 with the blueprint suite RUNNING (not
   skipped) — assert the suite is collected + its titles present via `npx vitest list -c vitest.integration.config.ts`.

## Constraints / decisions
- The composition fix means the cat-B exam ACTUALLY followed the blueprint for the first time (pre-fix nearly
  everything fell to `pdr`). Treat any distribution assertion failure as a real content-distribution finding,
  not a test bug — but first confirm the live seed has ≥1 published cat-B question in each mandatory section
  (structure/medicine/law/general/safety); if a section is genuinely empty on the seed, assert the block's
  chosen count is `min(quota, available)` and note it (do NOT weaken the spec silently — `log` the shortfall).
- Integration hygiene (CLAUDE.md): run `npm run db:seed` BEFORE `test:integration` in verify.sh so accumulated
  audit rows don't flake the suite; delete the throwaway user (cascades sessions) + analyticsEvent rows before
  fixture questions; use `createOfficialQuestion`-style fixtures only if the real seeded signs/blueprint topics
  are insufficient (prefer the REAL seeded topics for the directional oracle so bucketing is exercised).
- Do NOT change `computeReadiness` math here (tasks 02/06 own it); this task only routes the correct `section`
  into the existing block builder + proves it end-to-end.
- HIGH-STAKES (changes real exam composition + the dial's p-vector) → **Evaluate: yes**.
- Non-goals: correlation ρ wiring / inputsJson version tag (task 09), constants (task 08), UI (task 10).

## Next
- [x] Added the REAL-SEED DIRECTIONAL ORACLE (Goal #4) to `exam-blueprint.integration.test.ts`.
- ALL Goals met (#1/#2 wired in task 06 + verified; #3 suite un-skipped; #4 directional oracle;
  #5 typecheck 0 + suite collected/running). Status: done — driver re-runs verify (db:seed →
  test:integration → build). If verify red, first check whether a SIBLING file failed on shared
  dev-DB state (reseed) before touching this task's deliverable.

## Artifacts
- `lib/server/exam-blueprint.integration.test.ts` — drift-immune officialContentSeeded detection +
  live-reality PIN anchors (§31→132, §33→134); suite runs (not skips) on a seeded DB. NOW also
  carries the Goal #4 REAL-SEED DIRECTIONAL ORACLE (describe "blueprint bucketing drives the
  readiness p-vector by section (Goal #4)"): throwaway user STRONG in §33 signs (R=1 → pdr) + WEAK
  in structure/medicine/law/safety (R≈0.07), ReviewStates on real cat-B questions by
  questionKey→section, `recomputeReadiness(...,NOW)`; asserts (a) inputsJson.blocks pdr meanProb≥.8
  & ≥1 small block ≤.3, (b) persisted passProbability STRICTLY < homogeneous no-blocks fallback
  (het 1.3e-6 vs homo 2.3e-4, ~180× margin — pre-checked with the real fns). 4/4 tests pass.
- `lib/server/mastery-readiness.ts:208-211`, `lib/server/test-engine.ts:128-130` — both server callers
  already bucket via `sectionFromQuestionKey(questionKey)` (landed in task 06; verified this tick).
- `lib/server/practice-modes.integration.test.ts` — (e) blueprint-availability setup rebucketed by
  questionKey→section (was stale +99 displayOrder count); frozen vector re-derived to {2,2,1,1,1,8}.

## Log
- 2026-07-12 ClPcs-Mac-mini: Added the Goal #4 REAL-SEED DIRECTIONAL ORACLE to
  `exam-blueprint.integration.test.ts` (mirrors readiness-snapshot.integration §4 conventions:
  direct `reviewState.create`, fixed clock, `computeReadiness` relative oracle). Throwaway user:
  25 STRONG §33-signs states (stability 100, lastReviewedAt=NOW → R=1 → pdr block meanProb=1.0) +
  3 WEAK states each in structure(§31/45)/medicine(§37)/law(§36/38/39/46)/safety(§35/47)
  (stability 1e-4, lastReviewedAt=NOW−3650d → R≈0.068 → block meanProb≈0.068). Enough strong so
  seenMean≥0.5 → the honesty-floored unseen prior pins at 0.5 → homogeneous pool-mean μ≈0.50, a
  NON-vacuous pass window. Pre-verified with the REAL `retrievability`/`computeReadiness` fns
  (throwaway tsx, --conditions=react-server): het passProb 1.3e-6 STRICTLY < homo 2.3e-4 (~180×
  margin, not fragile). Assert (a) inputsJson.blocks[pdrIdx].meanProb≥0.8 & ≥1 small block ≤0.3
  (blocks stored positionally in CATEGORY_B_BLUEPRINT.blocks order, {quota,meanProb} only, so
  identify by index); (b) snapshot.passProbability < homogeneous no-blocks computeReadiness over the
  SAME seenR (rebuilt from the user's states). User delete cascades ReviewState+ReadinessSnapshot.
  typecheck 0; suite 4/4 pass; `vitest list` shows the new title collected. Goal #4 met → ALL goals
  met → Status: done.
- 2026-07-12 ClPcs-Mac-mini: FIXED the verify FAIL in `practice-modes.integration.test.ts` (e) — a
  cross-file consequence of task 06's bucketing fix. Task 06 routed the DIAGNOSTIC pool bucketing
  through `sectionFromQuestionKey` but left the (e) setup's `blueprintAvailability` computed via the
  STALE `sectionDisplayOrders(+99)` displayOrder count — which mis-reported structure=1/general=0 and
  passed the `blueprintReady` guard on wrong data, then the assertion (on correctly-bucketed picks)
  failed (structure=2). Rewrote availability to bucket the real cat-B pool by questionKey→section
  (drift-immune, same source the composer uses); measured TRUE availability structure 50 / medicine 59
  / law 37 / general 16 / safety 177 / pdr 1418 (all ample → no caps). Re-derived the frozen vector
  from the Hamilton apportionment ALGORITHM (nominal {2,2,2,1,2,11}×15/20 → floor {1,1,1,0,1,8}=12,
  +3 largest-remainder to general/structure/medicine) = {2,2,1,1,1,8} — NOT by reading composer
  output. Loosened the guard to "enough to fill the base alloc uncapped" (structure≥2,medicine≥2,
  law≥1,general≥1,safety≥1). Removed the now-unused `sectionDisplayOrders` import. typecheck 0;
  practice-modes suite 7/7 with (e) RUNNING. REMAINING: Goal #4 directional readiness oracle.
- 2026-07-12 laptop: planned. Depends on task 06 (sectionFromQuestionKey + new groupCandidatesByBlock
  signature). Two server callers: recomputeReadiness block builder + test-engine exam composer.
- 2026-07-12 ClPcs-Mac-mini: VERIFIED Goal #1+#2 already satisfied — task 06 wired BOTH server callers
  through `sectionFromQuestionKey(q.questionKey ?? "")` (mastery-readiness.ts:210, test-engine.ts:130,
  both selecting `questionKey`), no `displayOrder`-based bucketing remains. Confirmed live seed: §31
  ТЕХНІЧНИЙ СТАН→displayOrder 132, §33 ДОРОЖНІ ЗНАКИ→134, §37→138 (all section+101, NOT +99). Verified
  cat-B published pool buckets by questionKey with ample per-block content (structure 50, medicine 59,
  law 37, general 16, safety 177, pdr 1418 — every mandatory quota fillable). Goal #3: FIXED
  `exam-blueprint.integration.test.ts` — the `officialContentSeeded` guard keyed on `sectionDisplayOrder`
  (=section+99 → topics at 130/136 that don't exist) made the whole suite SKIP on a seeded DB. Rewrote
  detection to be drift-immune (buckets the live cat-B pool by questionKey→section, requires each
  mandatory block ≥ its min quota) and rewrote the PIN test to the LIVE anchors (§31→132, §33→134).
  Removed the now-unused `sectionDisplayOrder` import. `typecheck` clean; the suite now RUNS (3 passed,
  none skipped) against the seeded dev.db via `vitest run -c vitest.integration.config.ts`. REMAINING:
  Goal #4 directional readiness oracle (see Next).



## Verify
**Last verify:** PASS (2026-07-12T16:00:03Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T16:02:07Z)
