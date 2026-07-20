# Drivers School — improvement program (self-authored plan + driving prompt)

A long-running, multi-session effort driven through the Mesa harness (Ralph loop). Heavy work runs
in the driver's fresh per-tick contexts + read-only audit agents; the human-facing chat stays lean.
Durable state lives in files (this plan, `AUDIT.md`, `tasks/` journals, `CLAUDE.md`), not in chat.

## Mission
Take the working MVP to a trustworthy, polished, SECURE product for Ukrainian ПДР theory prep —
improving UX, behaviour, security, and adding high-value learning features — without ever weakening the
legal/demo positioning.

## Driving prompt (the directive every wave operates under)
1. Work in WAVES. Each wave: write a spec → `mesa plan <spec> <prefix>` → `mesa run-all` with
   `DRIVER_EVALUATE=1`. The planner makes atomic, boolean-criteria task journals; the driver does
   increment → verify (`typecheck && test`) → independent evaluator → learnings → done.
2. TESTS ON EVERY VALUABLE CHANGE. Keep new core logic PURE and unit-tested so the verify gate is real;
   each wave's final task runs `npm run build`. After each wave I independently re-verify (typecheck +
   tests + build + HTTP smoke) before starting the next.
3. SECURITY FIRST: validate all inputs, enforce RBAC server-side (never trust the client), no IDOR
   (a user may only read/mutate their own data), sanitize anything rendered (URLs/HTML).
4. NEVER weaken legal/demo positioning: no official-exam claims; demo content stays labelled; exam
   rules stay configurable constants.
5. Preserve: Ukrainian copy, mobile-first, the road-sign design system, the pure/`lib/server` split.
6. No schema change without a migration applied via `prisma migrate deploy` (migrate dev is
   non-interactive-broken in this shell — see CLAUDE.md). Regenerate the client after.
7. Every wave ends GREEN and independently verified. If a wave hits the tick cap, re-run `run-all`.
8. CONTEXT DISCIPLINE: monitor the driver via terse signals (run totals, task statuses, git log) — do
   not pull large diffs/transcripts into chat. Findings live in `AUDIT.md`; plan in this file.

## Waves (ordered; refine from AUDIT.md as it lands)
### Wave 1 — Security & correctness hardening
- Input validation (zod schemas) on every server action (auth/user/test/admin) → friendly Ukrainian errors.
- Login throttling (per-email + per-IP attempt limit) against brute force.
- Sanitize question image URLs (allow only http/https) at render and at admin save.
- Access-control hardening + integration tests: a user cannot load another user's session/result;
  a non-admin cannot reach any admin mutation; demo/published gating respected in the engine.
- Security headers (basic CSP/referrer/frame) where cheap.

### Wave 2 — UX & behaviour
- Resume an in-progress test (dashboard "continue").
- Exam: confirm-before-finish, warn on unanswered, a question navigator + flag-for-review, answered count.
- Pending/disabled states on all submits; graceful error boundaries (no raw error overlay).
- Accessibility: focus order, aria-labels, full keyboard operation of the test runner.

### Wave 3 — Learning features
- Mistake spacing (SM-2-lite) ordering (configurable); streaks / daily goal; readiness trend sparkline.
- More demo content depth (topics/questions); per-category exam config; account (change password, profile).

### Wave 4 — Testing depth & polish
- More integration tests (engine edge cases, access control); a lightweight HTTP e2e smoke script;
  review progress aggregation correctness/perf at volume.

## Resumption (multi-session)
To resume in a fresh session: read `PLAN.md` + `AUDIT.md` + `git log --oneline` + `mesa` task statuses;
pick the next unstarted wave; spec → `mesa plan` → `mesa run-all`; re-verify; update this file's
"Status" log below. Memory pointer: project-drivers-school.

## Status log
- 2026-06-17 — Program created. MVP scope-complete + verified. Audit running → AUDIT.md. Wave 1 spec drafted.
- 2026-06-17 — Audit done (0 Crit / 4 High / 5 Med / 5 Low; RBAC/IDOR/XSS/legal verified GOOD). Folded 2
  correctness bugs (finishSession idempotency, finish double-fire) into Wave 1. Wave 1 → plan + run-all.
- 2026-06-17 — **Wave 1 DONE + verified green.** 15 tasks / 39 ticks / ~$24. Independent check: typecheck
  PASS · 91 unit + 11 integration tests · build PASS. Shipped: lib/validation.ts (zod, all actions),
  lib/server/login-throttle.ts, lib/sanitize.ts (safeImageUrl), security headers, finishSession
  idempotency + finish double-fire latch, access-control tests, saved-pool publish/archive filter.
  Learnings 9→13. Remaining audit Med/Low items carried to Waves 2–4 (see AUDIT.md Wave column).
  **NEXT: Wave 2 (UX & behaviour)** — spec drafted at specs/wave2-ux.md.
- 2026-06-17 — **AUTONOMOUS RUNNER ENABLED.** `bin/program.sh` advances ONE gated wave per run
  (lock + clean-tree + independent green-gate + fail/total caps + STOP kill-switch), wired to launchd
  `com.driversschool.program` (RunAtLoad + 30-min interval; lock self-paces). It walks Waves 2→3→4 from
  `.program/manifest`, then re-audits — only unaddressed High/Critical findings generate a capped auto-wave;
  otherwise it CONVERGES and stops (no spend). No human prompts; safeguards are in code.
  **Kill switch:** `touch .program/STOP` (rm to resume) or unload the launchd job. Live state: `.program/`.
- 2026-06-17 — Audited snarktank/ralph (Carson's Ralph) vs our harness. Conclusion: the Mesa harness
  ALREADY implements the Ralph loop and EXCEEDS it — external verify gate + independent evaluator beat
  ralph's self-reported `passes:true`; auto-loaded CLAUDE.md learnings ≈ its progress.txt patterns. Did
  NOT copy ralph (would regress). ADOPTED its one missing idea: BRANCH ISOLATION — `program.sh` runs
  autonomous waves on `program/auto`, leaving `main` pristine. Review: `git log main..program/auto`;
  merge when satisfied: `git checkout main && git merge program/auto`.
- 2026-06-18 — **Analytics + admin overhaul SHIPPED + independently verified green** (6 commits on
  master, 804af41→edefd85). First-party, privacy-first analytics: additive `AnalyticsEvent` granular
  columns migration (all nullable, data-preserving, applied via `migrate deploy` — DB up to date);
  batched `POST /api/track` ingest (`app/api/track/route.ts`, the app's first route handler) with a zod
  whitelist (strips unknown keys → PII can't be smuggled), size-cap (413), per-source rate-limit (429,
  reuses login-throttle core), SHA-256 ipHash only (raw IP never stored), DNT/GPC + `ds_no_analytics`
  opt-out, first-party `ds_anon` cookie; client tracker + privacy notice; full admin IA overhaul (nav now
  links Огляд/Питання/Категорії/Теми/Версії контенту/Аналітика + breadcrumbs), KPI overview, question
  search/filter/bulk + redact, and a `/admin/analytics` dashboard (KPIs, funnel, time-series, device/event
  breakdowns) gated by `requireContentManager()`. FINAL VERIFY gate all PASS: typecheck · 216 unit · 59
  integration · build. Sanity: migration columns live (incl. ipHash, no raw-ip column); real POST handler
  acks 200 on valid batch, 400 on invalid, 413 on oversized; admin nav links resolve; RBAC rejects a USER.
  PRIVACY CHECK CONFIRMED: stored sample carries only ipHash (64-hex, never dotted IP) + whitelisted
  fields; smuggled password/answerText/email/ip are stripped; no raw-IP/password/answer/form-value column
  or write exists anywhere in the analytics path.
- 2026-06-22 — **Wave 3 CLOSED + independently verified green.** Drove the two straggler tasks
  (`wave3-feat-11-expand-seed-content`, `wave3-feat-12-verify-wave3`) — long stale-blocked on tick budget —
  through the harness with `DRIVER_EVALUATE=1` (both evaluator PASS). feat-11: `prisma/seed.ts` enriched to
  25 demo questions / 8 topics (was 16/6) + new read-only `seed-content.integration.test.ts` (count ≥24,
  one-correct, isDemo/DEMO invariants). It also fixed 4 integration suites left RED by the 24c80e4
  canonical-repo merge (which introduced the exam-blueprint feature + stricter demo-retirement): engine /
  finish-idempotency / access-control now self-provision throwaway OFFICIAL (`isDemo:false`) fixtures (the
  codebase's `demo-retired` pattern — seeded cat-B is all-demo, withheld from live pools while
  `SERVE_DEMO_QUESTIONS=false`); exam-blueprint's 2 official-content-dependent tests now runtime-`ctx.skip`
  on a `beforeAll` precondition. feat-12 fixed a false-fail in its OWN verify.sh check A (whole-file
  `Math.random` determinism grep tripped on `selection.ts`'s documented injectable-rng defaults — scoped it
  to exclude `rng` lines; `Date.now` still fully caught; `spacedMistakeOrder` confirmed pure). INDEPENDENT
  re-verify (me, not the journal): typecheck 0 · 18 unit files/216 passed · 25-q seed · 17 integration
  files/58 passed/**2 skipped** · build 0. Scope guards clean: schema unchanged, no feature code in feat-12.
  **KNOWN GAP / Wave-5 candidate:** the 2 skipped exam-blueprint tests (§37/§31 PIN renumber guard + 20-q
  blueprint composition) stay DORMANT until official ПДР content is imported — and NO current task imports
  it (feat-12 is verify-only; the journal's "feat-12 will import" hand-off note is inaccurate). An official
  content-import task would both wake those tests and give live pools real (non-demo) content.
- 2026-06-22 — **Wave 5 (Learning effectiveness) PLANNED + EXECUTED autonomously + independently verified
  green.** Authored `specs/wave5-learning-effectiveness.md` → `mesa plan … wave5` (11 atomic tasks) →
  `DRIVER_EVALUATE=1 run-all`: all 11 DONE in one ~62-min pass, EVERY task verify PASS + evaluator PASS,
  zero blocked (02/06/09 self-corrected after a first-tick verify FAIL — the loop working). Shipped, all
  pure-logic-first + tested, NO schema change: (A) daily spaced-review queue — pure `dueMistakes()` in
  `lib/test-engine/selection.ts` + `REVIEW_INTERVALS_HOURS` + `lib/server/mistakes.ts` due-count +
  dashboard "на повторення" card + `due-mistakes.integration.test.ts`; (B) per-topic mastery — pure
  `lib/mastery.ts` (weak/learning/strong bands, reuses WEAK_TOPIC thresholds) + `lib/server/mastery.ts` +
  new learner `/progress` view (weak-first, non-colour markers, "Практикувати" links); (C) exam-readiness
  estimate — pure `lib/readiness.ts` + dashboard surface, legal-gated. INDEPENDENT re-verify (me, not the
  journals): typecheck 0 · **244 unit / 21 files** · 25-q seed · **60 integration / 18 files (2 skipped)** ·
  build 0 · all 4 new test files run · schema UNCHANGED · "гарантія" only ever NEGATED. REAL-TRANSPORT
  browser audit **14/14 green** over `http://100.110.64.90:3100` (drove /progress + the readiness estimate
  live). Process note: the audit's 1 initial FAIL (exam-start → `?empty=EXAM_SIMULATION`) was the
  demo-only-seed empty-pool artifact, NOT a regression — resolved by `npx tsx scripts/import-official.ts`
  (1691 official Qs / 63 topics into the dev DB), after which start routes to `/test/`. New CLAUDE.md
  learning records this audit data-prereq. All 22 wave-5 commits pushed; HEAD == origin/main. (Security &
  runtime audit remain CONVERGED; the 2 dormant exam-blueprint tests still await a content-import-into-SEED
  task — unchanged by Wave 5.)
- 2026-06-23 — **Wave 6 (official content + image pipeline) PLANNED + EXECUTED autonomously + independently
  verified green.** `specs/wave6-content-image-pipeline.md` → `mesa plan … wave6` (11 tasks) →
  `DRIVER_EVALUATE=1 run-all` (one run was killed early + cleanly resumed from a committed scaffold). 10/11
  DONE in the resumed pass; wave6-04 (q-image route) finished as a STALE BLOCK — its own deliverables (route
  + resolver + test, 3/3 isolated) were complete, but its full-suite gate stayed red until wave6-08 rescoped
  `seed-content` (it honestly refused to game its gate); re-running its verify.sh after → PASS, flipped to
  done. SHIPPED: (A) additive migration `20260623091643_question_image_key` (`Question.imageKey`, applied via
  `migrate deploy`); (B) PURE `lib/image-resolve.ts` (`imageCandidatePaths`/`isSafeKey`, tiers
  override▸restyled-live▸original, traversal-rejecting regex) + server resolver (path-containment guard) +
  `app/api/q-image/[key]/route.ts`; (C) `resolveImageSrc` wired in `test-runner.tsx`; (D) importer sets
  `imageKey`, re-import-safe; (E) `golive.mjs` reworked to publish into `public/restyled-live/` (NO DB flip —
  permanently fixes the clobber that bit me earlier); (F) `db:seed` auto-loads official (idempotent) + 8 demo
  topics RETIRED (deactivated; 25 demo Qs preserved for the invariant); (G) `practice/page.tsx` scoped to
  servable+category topics. INDEPENDENT VERIFY (me, live): migration + 734 official imageKeys set / 1691
  official Qs / 25 demo Qs; typecheck 0 · 266 unit/22 files · 67 integration/19 files · build 0; the route
  serves over real HTTP with **override▸restyled-live▸original precedence proven** (drop file in
  `image-overrides/` → wins instantly, remove → reverts; no DB/re-import), 404 on miss, traversal → 404;
  practice shows **43 cat-B topics, 0 empty cards** (off-category А/C/D/T/BE hidden, В1,В kept); REAL-TRANSPORT
  browser audit **14/14**. Images are now swappable by dropping a file in a tier — no DB edit, no re-import.
  All wave-6 commits pushed; HEAD == origin/main.
- 2026-06-23 — **Wave 7 (question content keys + idempotent upsert + official-only) DESIGNED + BUILT
  autonomously + independently verified.** Owner asked to extend the image-key pattern to questions.
  Design captured in `docs/CONTENT-ARCHITECTURE.md`; built from `specs/wave7-content-keys.md` via `mesa plan`
  (9 tasks) → `DRIVER_EVALUATE=1 run-all`. The evaluator earned its keep — REJECTED tasks 02 and 05 once
  each (schema + upsert core) → fixed → PASS. 08 (guarantee test) + 09 (gate) blocked mid-run on a USAGE
  LIMIT (increment failures, not real fails); reopened + finished after the limit reset. SHIPPED: additive
  migration `Question.questionKey` (unique) + `QuestionOption.optionKey` (unique); pure `lib/content-key.ts`
  (`q_<section>_<qnum>` / `<key>__<n>`) + pure `applyOverride` (per-field, override-wins) with the corrections
  layer `.content-import/overrides/<key>.json`; `importOfficial` rewritten from DELETE-RECREATE → UPSERT-BY-KEY
  (id-preserving, options reconciled by key, removed→deactivated, NEVER deletes user-progress rows); demo
  content DELETED (seed is official-only, `seed-content` test removed); `content-upsert.integration.test.ts`
  proves the guarantee. INDEPENDENT VERIFY (me, direct, no LLM): re-running the loader changed **0/1691
  question ids and 0/5555 option ids** (idempotent) and a planted `SavedQuestion` SURVIVED + still resolved;
  full gate typecheck 0 · 283 unit/24 files · official-only seed (1691, 0 demo, 0 null keys) · 66 integration/19
  files · build 0 · **browser audit 14/14** · keyed image route still serves. Day-to-day replace = edit
  `.content-import/overrides/<key>.json` → reload → that question upserts in place, all dependencies + user
  progress intact. Vestigial `SERVE_DEMO_QUESTIONS`/`demoWhere` left as a noted follow-up. All wave-7 commits
  pushed; HEAD == origin/main.
- 2026-06-23 — **Wave 8 (retire demo-serving dual-mode) DONE + independently verified.** The Wave-7
  follow-up: `mesa plan` (6 tasks) → `run-all` → all 6 done (05 self-corrected after one verify FAIL).
  Removed `SERVE_DEMO_QUESTIONS` + `demoWhere` from `lib/constants.ts`, `lib/server/test-engine.ts`
  (base/mistake/saved pools now just published+active), and `app/(app)/practice/page.tsx`; deleted the
  obsolete `demo-retired.integration.test.ts`; scrubbed stale token comments; extracted a shared
  `lib/server/__testutils__/official-question.ts` fixture helper (adopted by 4 suites). KEPT the
  `isDemo`/`sourceType` columns + the validation consistency refine (data guards). INDEPENDENT VERIFY (me):
  `grep SERVE_DEMO_QUESTIONS|demoWhere lib/ app/` = **0**; typecheck 0 · 283 unit/24 files · official-only
  seed (1691) · 63 integration/18 files (−3/−1 = the deleted demo-retired test) · build 0 · browser audit
  14/14. Behaviour unchanged (it was a no-op with 0 demo rows). All wave-8 commits pushed; HEAD == origin/main.
- 2026-06-24 — **Wave 9 (deeper content statistics + quality flags + admin view) DESIGNED + BUILT
  autonomously + independently verified.** `specs/wave9-content-stats.md` → `mesa plan` (8 tasks, after a
  re-plan: the first planner run hit a usage limit mid-generation leaving 4 stub journals — wiped + re-planned
  clean) → `run-all` → all 8 done (the page got an evaluator REJECT → fixed → PASS). COMPUTE-ON-READ, NO
  schema change. SHIPPED: pure `lib/content-stats.ts` (`summarizeQuestion` → accuracy + avg time + per-option
  pick distribution, building on the existing `summarizeQuestionPerformance`); pure `lib/content-flags.ts`
  (`WRONG_KEY_SUSPECTED` when a distractor out-draws the keyed answer, `LOW_DISCRIMINATION`,
  `INSUFFICIENT_DATA`); `lib/server/content-stats.ts` aggregation (groups TestAnswer, joins option/question
  keys, topic rollups, flagged-first); admin `/admin/content-health` view (KPIs + per-question table with
  option-distribution bars + flag badges + topic rollup, `requireContentManager`, privacy-safe aggregates,
  nav link «Якість контенту»); `content-stats.integration.test.ts` proves WRONG_KEY_SUSPECTED fires on a
  seeded distractor-beats-correct case. INDEPENDENT VERIFY (me): typecheck 0 · 292 unit/26 files · official
  seed 1691 · 65 integration/19 files (incl. the flag test) · build 0 · schema UNCHANGED · `/admin/content-health`
  renders for admin + RBAC bounces a non-admin · browser audit 14/14 (a first run showed 4 fails from an
  interleaved agent-browser admin session, NOT a regression — a clean re-seed+rerun was 14/14). Stats are
  zero until users answer questions; they populate live and survive content reloads (stable Wave-7 keys).
  Out of scope (noted): new recorded signals (skip/answer-change/flag-for-review), a denormalized QuestionStat
  table (only if compute-on-read gets slow at volume), learner-facing surfacing. All wave-9 commits pushed.
- 2026-07-01 — **App MASTER PLAN authored (autonomous 13-agent Workflow) → `docs/app-plan/` (00–05 + README).**
  Holistic evolution thesis: own the empty **calm · premium · emotionally-aware · mobile-first** quadrant for
  anxious first-timers. Three moat pillars = honest FSRS-derived **readiness dial** (predicted P(pass), not
  %-seen) · finite **test-date study ritual** · **calm-nerves layer** (graded exposure, Світлик pacer,
  mistakes-as-shrinking-strengths, anti-leaderboard). Roadmap = **Waves 10–14** (SRS foundation · adaptive
  loop + honest dial · design-system port · PWA/offline/AVIF · engagement+telemetry+calm-nerves). Deploy =
  **self-hosted Node box** (keep Postgres-portable). See `docs/app-plan/00-MASTER-PLAN.md`.
- 2026-07-01 — **Wave 10 (SRS foundation — FSRS engine + learning-state schema, NO UI) BUILT autonomously +
  independently verified.** `specs/wave10-srs-foundation.md` → `mesa plan` (11 atomic tasks) →
  `DRIVER_EVALUATE=1 run-all` (18 ticks, evaluator PASS on every task incl. the schema + integration
  data-integrity surfaces). Purely additive over Waves 1–9; stable-key architecture untouched. SHIPPED:
  one hand-authored migration adding **9 learning-state tables** (`ReviewState`, `ReviewLog`, `TopicMastery`,
  `UserStudyProfile`, `StudyDay`, `ReadinessSnapshot`, `UserSettings`, `PushSubscription`, `NotificationLog`) +
  `TestAnswer.confidence` (all additive/nullable, no reseed); pure unit-tested `lib/fsrs/*`
  (`schedule`/`retrievability`/`deriveGrade` + `FSRS_DEFAULT_WEIGHTS`/`FSRS_TARGET_RETENTION`); pure
  `lib/test-engine/queue.ts` (overdueness×(1−R)×topic-weakness, interleaving, new-item share); pure
  `lib/readiness-model.ts` (exact Poisson-binomial P(≥18/20) + unseen-prior + mock-shrinkage);
  `ADAPTIVE_REVIEW` mode; `lib/server/study.ts` `recordReview` wired INTO `submitAnswer`'s `$transaction`
  (lazy `ReviewState` upsert + idempotent `ReviewLog` by `clientEventId`), return shape UNCHANGED;
  `srs-review.integration.test.ts`. INDEPENDENT VERIFY (me): typecheck **0** · **324** unit/31 files (incl.
  fsrs 20 / queue 10 / readiness-model 8) · `db:seed` **2322** official (idempotent, 0 missing correct) ·
  **67** integration/20 files incl. `srs-review` · `build` **0** (23/23 pages) · 9 tables + `confidence`
  live in `prisma/dev.db` · pure modules clean · **stable-key preserved** (`srs-review` + `content-upsert`
  both green: re-import keeps question/option ids + SRS rows). No browser audit (engine-only, no UI). New
  CLAUDE.md learnings: `prisma migrate diff --from-config-datasource` for scoped additive migrations · libsql
  adapter mandatory on bare `PrismaClient` · `--conditions=react-server` for `tsx` smokes of server-only
  modules. All wave-10 commits pushed (HEAD == origin/main). Follow-up: CLAUDE.md at 30 learnings (cap 25) —
  prune. **NEXT: Wave 11** (adaptive loop + honest readiness dial; shadow-run the FSRS dial beside the legacy
  readiness before it becomes the hero; confirm `FSRS_TARGET_RETENTION` 0.90 vs 0.85).
- 2026-07-02 — **Wave 10f (fix wave: ALL 18 confirmed findings of the Wave-10 adversarial review + 2 spikes)
  BUILT autonomously + independently verified + adversarially re-reviewed + post-review-fixed.**
  `specs/wave10f-review-fixes.md` → 19 tasks → `run-all` on the NEW model tiering (Opus ticks + Opus
  evaluator; 22 ticks, **$21.53** — cheaper per task than Wave 10 on the default model). SHIPPED: the
  **external golden-vector gate** (`lib/fsrs/reference-vectors.test.ts`, vendored from ts-fsrs@5.4.1 —
  the anti-self-grading keystone); prior-difficulty stability fix; FACTOR/DECAY hardcoded (19/81, −0.5);
  readiness Beta mock anchor by COUNTS + per-block heterogeneous DP + unseen-prior honesty floor; queue
  additive scoring + newItemShare hard cap; **SRS fields unstripped through the action layer** (they were
  dead code in prod); whole-transaction idempotency; ADAPTIVE_REVIEW gated via `STARTABLE_MODES`;
  ReviewLog/ReviewState FK Cascade→Restrict (SQLite table-rebuild); drift-zero migrations. SPIKES (both
  POSITIVE, W13 de-risked): Serwist emits sw.js via `next build --webpack` on Next 16; sharp AVIF ≈9 KB on
  Node 25. **wave-review** (the now-SAVED workflow `.claude/workflows/wave-review.js`, first live run)
  verdict PROCEED-WITH-CHANGES → 4 more confirmed findings FIXED same night (commit 2060118): deriveGrade
  three-band latency (single 8s cliff made Good(3) UNREACHABLE in production — the exact
  distribution-blind-spot class), first-attempt-only FSRS writes (exam re-selection ≠ retrieval), queue
  overdueness spec formula, MIN_STABILITY→1e-3. PLUS a real-browser UX audit found + fixed a BLOCKER:
  unguarded `crypto.randomUUID()` broke ALL answering over plain http (insecure context — the
  Secure-cookie class reborn); browser-audit extended to 16 assertions incl. an actual answer-click.
  Also: onboarding defaults to category B; localized 404; Состав→Склад. INDEPENDENT VERIFY (me, post-fix):
  typecheck 0 · **353** unit/32 (golden vectors green) · **71** integration/20 (+§6 answer-change test) ·
  build 0 · migrate-diff EMPTY · **browser audit 16/16** over the real transport. Deferred findings routed
  to wave specs in `docs/app-plan/UX-FINDINGS-2026-07-02.md`. **NEXT: Wave 11** — server core + admin
  shadow dial ONLY (per the re-scope; learner UI waits for W12a/b); W11 spec must fold in the UX-FINDINGS
  Wave-11 items + per-topic median latency bands.
- 2026-07-02 (same night) — **Wave 11 (adaptive loop + honest readiness: server core + admin shadow, NO
  learner UI) BUILT + independently verified + wave-reviewed + review-fixed.** `specs/wave11-adaptive-core.md`
  → 16 tasks → run-all (26 ticks, $30.76, Opus). SHIPPED: `startAdaptiveReview`/`startSpacedReview`
  (queue-driven `TestSession`s via the pure picker; both modes STARTABLE through the real action);
  `TopicMastery.medianLatencyMs` (additive col) → per-topic latency bands feeding `deriveGrade` inside
  `submitAnswer`'s tx; `finishSession` → `recomputeTopicMastery` + `recomputeReadiness` (per-block blueprint
  DP + Beta mock anchor by counts + `sufficientData` flag <20 seen) → `ReadinessSnapshot`;
  `scripts/nightly-readiness.ts` + launchd plist (runs via `--conditions=react-server`; idempotent);
  UserStudyProfile actions + StudyDay (Kyiv DST-correct day keys) + pure auto-freeze streak policy + pure
  finite study-plan math; **`/admin/readiness-shadow`** (legacy vs FSRS dial + delta — the W12b dial-promotion
  instrument); browser-audit 17th assertion. WAVE-REVIEW verdict PROCEED-WITH-CHANGES (7 confirmed, 0
  rejected; no-UI constraint HELD, no wave10f regression creep) → fixed same night (932b4f5): **SPACED_REVIEW
  due-only** (was all-seen — the calm «нічого не заплановано» finish was unreachable), adaptive
  zero-published guard, per-block unseen-prior honesty floor, + behavioral tests for both blind spots
  (due-only semantics; a 1000ms topic median flipping a 4000ms answer Easy→Good through the REAL tx).
  INDEPENDENT VERIFY (me, post-fix): typecheck 0 · **376** unit/36 · **88** integration/24 · build 0 ·
  drift ZERO · nightly job idempotent ·**audit 17/17** over the real transport. Deferred to the W12b spec
  (review's coherence call): finish-path recompute retry-ability, double profile upsert, streak↔StudyDay
  divergence. **NEXT: Wave 12a** (design-system port: tokens/glass tiers/component kit; then W12b learner
  surfaces + dial promotion gated on the shadow-run reading sane).
- 2026-07-02 — **Wave 12a (design-system port: «Спокій · Рідке скло» into the app) BUILT + verified +
  reviewed + review-fixed.** `specs/wave12a-design-system.md` → 15 tasks → run-all (Opus). SHIPPED:
  landing tokens → Tailwind v4 `@theme`; THREE glass tiers (emulated default = zero backdrop-filter,
  `.glass-real` opt-up on strong signals, solid a11y fallback) + pure `lib/glass-tier.ts` + no-flash
  inline + `UserSettings.glassTier` read; the **glass TAB CAPSULE** (bottom thumb-zone on phone, 5
  targets, replaces the old scroll-strip nav); restyled buttons/badges/cards/forms (dark-ink-on-tint
  taste law, WCAG-pair unit test over literal token hexes); runner restyle (44px option cards, icon
  Save/Flag, «повторити» submit-retry, calm q-image placeholder); Світлик component on empty states +
  result; `bin/design-shots.sh`; audit → **19 assertions**. WAVE-REVIEW (design lenses)
  PROCEED-WITH-CHANGES → fixed same session (1fe7747): capsule 390px fit (confirmed major —
  overflow:hidden clipped «Профіль»), no-flash inline now MIRRORS the pure resolver (weak desktops
  painted real glass at first paint — the untested-mirror class), content-aware shots gate (size-only
  gate had passed error-page PNGs). My overlap finding was REFUTED by the skeptics (pb-28 existed) —
  the verify layer works both ways. INDEPENDENT VERIFY: typecheck 0 · **405** unit · **88** integration ·
  build 0 · **audit 19/19** · direct-390px capsule check green. Notes: one review agent died at the
  StructuredOutput retry cap (taste lens — covered by production-path's clean scan); `UserSettings.glassTier`
  has NO writer yet (W12b §E ships the settings UI); shots-script phone-viewport intermittency queued into
  W12b's shots task. **NEXT: Wave 12b (FULLY ON FABLE 5 per Danil)** — learner surfaces per
  `specs/wave12b-learner-surfaces.md`.
- 2026-07-02 — **Wave 12b (learner surfaces, FULLY ON FABLE 5) BUILT + verified + craft-reviewed +
  review-fixed. W12 COMPLETE.** 18 tasks · 37 ticks · **$114.38** · ZERO evaluator rejects/verify fails
  (the cleanest run yet, on the biggest UI wave — the Fable premium bought real quality). SHIPPED: the
  honest dial as dashboard hero (sufficientData guard: no number/verdict <20 seen → «ще N питань» +
  progress bar); pure `recommend-action` (outcome-branching — no more congratulating a failed mock); plan
  card «Сьогоднішній план» one-tap→ADAPTIVE_REVIEW; adaptive/spaced mode cards + due-badge + calm
  nothing-due state; result screen «Найбільше помилок у темах» + «без відповіді» honest labels; runner UX
  (sticky exam chrome, thumb action bar, digit keys 1–4, swipe, auto-scroll, reload keeps index,
  deterministic 1-in-5 confidence chip + replay-safe `setAnswerConfidenceAction`); onboarding steps
  (exam date + goal → «Ваш перший план»); profile settings incl. the glassTier writer; «Карта тем»
  (anti-leaderboard bands); UA client validation; `finalizeSession` idempotent refactor. Audit → **30
  assertions**. WAVE-REVIEW ran WITH THE frontend-design CRAFT LENS (Danil's standing rule) — 14
  confirmed / 0 rejected → ALL FIXED same session (24dc758): honest Світлик result copy (timer-expiry
  path claimed mistakes that didn't exist), one-tap Карта-тем rows (390px cramping, 4-lens consensus),
  finalize retry made REACHABLE (was test-only — the false-green blind-spot class again) + snapshot
  guard (my own fix initially broke the finish-idempotency contract; the existing suite caught it —
  gates guarding MY work too), flip-edge streak credit in `bumpStudyDay` (no-session goal days +
  timezone midnight), `countDueReviews` coverage, viewport-hardened `design-shots.sh` (phone captures
  now VERIFIED 390×844), name-preserving pending labels (craft lens). INDEPENDENT VERIFY (final):
  typecheck 0 · **487** unit · **100** integration · build 0 · drift zero · **audit 30/30** ·
  true-geometry shots. **NEXT: Wave 13 (PWA/offline/images, ON FABLE 5)** per the master plan + SPIKES.md
  verdicts (`next build --webpack` Serwist path · sharp build-time AVIF ≤120KB in the resolver ·
  opt-in offline packs · `/api/review-sync` + Background Sync · client reviewedAt + per-user event-id
  namespacing land HERE where the offline contract bites).
- 2026-07-03 — **Wave 13 (PWA/offline/images, ON FABLE 5) BUILT (through a usage-limit stall + reopen) +
  verified + reviewed + review-fixed.** 20 tasks ($39 pre-stall + resumed run). SHIPPED: Serwist SW via
  `next build --webpack` (docs NetworkOnly — an authed page/login redirect can NEVER be an SW artifact,
  review-verified; `/~offline` fallback; q-image caching split variants-vs-originals); installability
  (manifest + Світлик maskable icons + iOS meta + dismissable hint); AVIF/WebP prebake ≤120KB (largest
  emitted 94KB; typical ~9KB vs 342KB originals) negotiated INSIDE the sacrosanct `/api/q-image/[key]`
  resolver; offline WAL + `/api/review-sync` (reviewedAt-ordered, clamped client time, per-item isolation,
  cross-user-spoof-proof **per-user event-id namespacing** — all 3 lookup sites migrated consistently,
  review-verified); opt-in topic packs (size-confirm, 50MB governance, `SERVABLE_QUESTION_WHERE` pinned to
  live pools); offline E2E (Playwright setOffline: fallback renders; offline answer lands EXACTLY once).
  WAVE-REVIEW: first attempt gutted by a session limit (4/5 lenses died — treated as VACUOUS, not clean;
  resumed via workflow resume with fresh limits) → verdict **PROCEED-WITH-CHANGES (minor), 0 critical/major**;
  3 confirmed minors FIXED same session (5dd3697): SW original-image TTL split (30d CacheFirst defeated the
  route's deliberate 1h on the mutable overrides tier), finish-before-drain fallback (own-finished-session
  items now land in the SRS-only lane via the new `SESSION_NOT_ACTIVE` class instead of silently losing the
  answer), stale-replay LOG-ONLY guard (`recordReview{logOnly}` — an old offline review can never regress
  FSRS state backward) — each with a new integration test (review-sync now 13/13). ALSO: the
  analytics-dashboard top-N fixture NOISE-PROOFED (201-event fixture) after its third displacement-by-audit-
  traffic recurrence. INDEPENDENT VERIFY (final): typecheck 0 · **523** unit · **126** integration · webpack
  build + sw.js 106KB · drift zero · **audit 40/40** · offline E2E green. W14 spec must fold the review's two
  refinements: offline reviews carry NO confidence (calibration panel must state the exclusion) and
  `/account/data` must enumerate ALL W10–13 learning tables + note IndexedDB offline data is client-side only.
  **NEXT: Wave 14 (engagement/telemetry/calm — STANDARD harness: Fable planner via planModel, Opus ticks).**
- 2026-07-03 — **Wave 14 (engagement/telemetry/calm/data-rights) BUILT + verified + reviewed + review-fixed.
  THE WAVE-10–14 PROGRAM IS COMPLETE.** 15 tasks · $43.55 · standard harness (Fable planner via planModel,
  Opus ticks) · zero rejects. SHIPPED: in-app nudges (pure policy matrix, one/day + rolling ≤4/7d cap,
  dismissible card, settings-gated, Світлик voice only on the day-off offer, zero emoji); confidence
  calibration panel (≥20-sample gate, offline exclusion stated, nightly calibrationSlope → readiness);
  pre-exam breathing ritual (skippable, reduced-motion path, fails open into a real session); /account/data
  export + type-to-confirm cascade delete; /admin/learning-health (REVIEWED coverage, observed-vs-authored
  difficulty via live ReviewLog grades, uptake, nudge volume); analytics pruning (180d, chunked) in the
  nightly. FINAL WAVE-REVIEW: PROCEED-WITH-CHANGES — 2 majors, both the self-authored-blind-spot class,
  FIXED same session (644feb0): the calm cap now counts IMPRESSIONS not dismissals (an ignoring user could
  get 7/7d), and the export now includes ProgressSnapshot (+PushSubscription; AdminActionLog excluded WITH
  a stated reason — its key is adminUserId, and it's an ops audit trail). FINAL VERIFY: typecheck 0 ·
  **554** unit · **154** integration · drift zero · build 0 · **audit 52/52** over the real transport.
  DEFERRED (recorded, no silent drops): Web Push/VAPID (needs public origin) · monetization (launch free)
  · Postgres cutover · QUICK/MARATHON/SIGN_TRAINER modes · per-user FSRS optimizer · diagnostic onboarding
  seed. PARKED by Danil: app public origin · phone-landing redo · Safari glass investigation.
- 2026-07-03 — **Wave 15 (practice modes QUICK/MARATHON/SIGN_TRAINER/DIAGNOSTIC) BUILT + verified +
  reviewed + review-fixed.** 16 tasks · $42.10 · standard harness (Fable planner, Opus ticks, evaluator
  on, wave15-11 escalated to Fable) · zero evaluator rejects. SHIPPED: the four master-plan deferred
  modes as presets over the FSRS queue picker — QUICK («Швидка сесія», 10 due-first, soft 5-min hint,
  counts to daily goal) · MARATHON («Марафон», endless paged 20/page via new `extendSession` server
  action — IDOR/mode/status-guarded, JS set-diff dedupe, calm «все пройдено» exhaustion state,
  resumable) · SIGN_TRAINER («Знаки», §33/§34 + image-bearing drill) · DIAGNOSTIC («Стартова
  перевірка», ~15 blueprint-spread from onboarding, exam-style server-enforced withheld reveal, seeds
  first ReviewState, finish = honest dial (sufficientData passthrough) + weakest topic + plan CTA,
  completed-guard from session table — NO schema change; `git diff -- prisma/` empty, migrate-diff
  clean). WAVE-REVIEW: PROCEED-WITH-CHANGES — 1 major + 3 minor, all fixed same session (41269c4):
  the major was **SIGN_TRAINER_TOPIC_ORDERS=[132,133] pointing at technical-state/procedural topics**
  (real signs/markings = 134/135 per live-DB ground truth) masked by a self-confirming fixture — fixed
  constant + fixture now binds 134/135 AND asserts a decoy@132 is excluded; the blueprint-spread
  integration test was green-by-perpetual-skip with an unsatisfiable frozen vector — now executes on
  the real corpus (real-data vector structure 1 · medicine 3 · law 2 · general 0 · safety 1 · pdr 8 +
  availability invariants); finish-reveal test rewired through production `getSessionState` mapping;
  onboarding CTA copy de-absolutized («без оцінок» — a diagnostic DOES seed ReviewState/streak/dial).
  ALSO: CLAUDE.md learnings pruned 45→29 (6af50c6). FINAL VERIFY (post-fix): typecheck 0 · **576**
  unit · **171** integration (+2 honest skips) · build 0 · **audit 66/66** over the real transport.
  Master-plan deferred backlog now: Web Push (origin) · monetization · Postgres · per-user FSRS
  optimizer · SIGN_TRAINER recognition sub-mode. PARKED by Danil: public origin (Gate 0) ·
  phone-landing redo · Safari glass. Roadmap: docs/app-plan/ROADMAP-2026-07-03.md.
- 2026-07-04 — **Wave 16 (monetization scaffold) DONE + independently verified + reviewed.** Driven from
  `specs/wave16-monetization-scaffold.md` (source: `docs/strategy/VISION-2026-07-04.md`, built on the
  3-round verified positioning research in `docs/strategy/`): 16 tasks / 25 ticks / $53, zero standing
  rejects. Shipped behind `ENTITLEMENTS_ENABLED` (default OFF, proven inert): Entitlement model +
  additive migration; pure entitlement engine (frozen oracle); admin grant/revoke; `/pricing` (399 ₴
  «Доступ до іспиту», interest-capture, NO payment integration — Gate 0); locked teasers on the
  intelligence surfaces; permanent never-gated test (content/modes/simulator); exam-outcome capture +
  day-8/9 retake win-back inside the capped nudge infra; optional JTBD onboarding questions →
  whitelisted analytics; public `/q/[key]` SEO pages noindex-gated on APP_ORIGIN + gated sitemap.
  Independent verify: typecheck 0 · 603 unit · 216 integration (1 new) · build · **browser audit 81/81**
  (incl. flag-OFF inertness + /q no-answer-leak). Wave-review (7 lenses): proceed-with-changes, 1
  confirmed finding + 2 self-verified hardenings, all FIXED same day: Entitlement added to
  /account/data export; analytics `metadata` PII vector closed (≤64 chars, no `@`, + regression test);
  `/q ?v=` empty-string spurious reveal guarded. OPEN product decision for Danil: spec T1 lists
  calibrated reminders as paid, code ships them free — decide before entitlements flip ON. Launch
  checklist (human): UA IP-lawyer consult (blocks PUBLIC launch only) · pricing smoke 399 vs 499 ·
  JTBD interviews → final copy (`COPY-PENDING-L4` markers) · автошкола pilot. Same day the LANDING
  L-wave shipped to the live preview (v15): dial-led hero + «1 з 5» hook, before/after restyle slider,
  first-viewport live question, exam-date CTA, trust band (399 ₴).
- 2026-07-05 — **Wave 17 (value-first conversion funnel) DONE + independently verified.** Danil reversed
  the settled signup-gate → VALUE-FIRST (`specs/wave-conversion-funnel.md`); run-now scope built the core
  behind `VALUE_FIRST_FUNNEL` (default OFF, Wave-16 pattern). 14 tasks / ~$116 (Fable daily-limited all day
  → everything on Opus incl. planner via `DRIVER_PLAN_MODEL`, and 05/08 after removing their Fable escalation
  marker — the sole cause of their fast-fail blocking). Shipped: anon session (cookie-scoped, no PII) +
  nullable-User migration (RedefineTable, data-preserving); content-never-gated anon play path; anon→user
  progress MIGRATION on register (convert-in-place, cookie-only identity=no IDOR, idempotent — bit wave17-05:
  read anon row via `tx` inside the $transaction, not global prisma, or it rolls back); post-value
  save-progress prompt (neutral dismiss); self-segment onboarding; value-triggered offer card («Ти на N%»,
  399₴ one-time, «не підписка»); STUBBED checkout→server-authoritative EXAM_ACCESS grant; PWA manifest+A2HS;
  funnel analytics (privacy whitelist); perf-floor CLS; executable DO-NOT dark-pattern guard. Verify: typecheck
  0 · **608 unit · 235 integration** · build · browser audit **82/82 flag-OFF** (inertness: today's gate intact)
  + **97/1 flag-ON** (the 1 = an audit-script false-fail: agent-browser JSON-quotes a clean empty result as
  `""` → FIXED bin/browser-audit.sh). Real anon flow proven flag-ON: play→save-prompt→register→migrate.
  Wave-review (⚠ skeptic-verify pass Fable-limited → findings reviewer-raised, self-adjudicated): schema clean;
  core invariants HELD (migration no-IDOR+idempotent, checkout server-authoritative, content-never-gated,
  dark-pattern copy clean, flag-off inert). The 2 "significant" production-path findings are BY-DESIGN
  (CLAUDE.md note): anon end-state = save-prompt, NOT the offer (offer is authed+diagnostic+data-sufficient,
  `/result` requireUser intentional); stub-checkout deliberately UNLINKED (a free-grant stub must not be one
  tap away — wires at Gate 0 with real payment). CARRIED to the Gate-0 wiring pass (flag-gated, non-urgent):
  activation_aha undercount (keyed on answer#1, misses DIAGNOSTIC/EXAM first-answer); readiness_aha needs a
  once-guard; /test/[id] page should use read-only getAnonUser like its layout (cookieless direct-nav
  mint-during-render edge); T5 segment onboarding lacks unit/integration coverage; real payment integration +
  anon-row rate-limit/GC + flag-coherence cleanup. **STILL BLOCKED ON DANIL: public origin (Gate 0) + a
  LiqPay/Fondy payment account** — the funnel is built behind flags, flips live when both exist.
- 2026-07-06 — **Wave 17 CORRECTION (Opus skeptic re-verification, 14 findings, 15 agents).** The prior
  closure's "the 2 major prod-path findings are BY-DESIGN" call was WRONG on one of them — the Fable-killed
  skeptic pass was re-run on Opus and OVERTURNED it (report: `docs/strategy/wave17-skeptic-verdicts-2026-07-06.md`).
  Adjudication: **CONFIRMED_REAL 8 · BY_DESIGN 3 · KNOWN_DEFERRED 2 · FALSE_POSITIVE 1.**
  ▸ The "by-design" cover was correct for the OFFER CARD (genuinely authed+diagnostic+data-sufficient) but
    wrongly extended to the whole `/result` page: `result/page.tsx:22 requireUser()` hard-walls an anon to
    /login at the value payoff, even though the entire path there (finishTestAction, finish button,
    COMPLETED→/result redirect) is anon-capable — and the walled content is FREE value (score/stats/review),
    NOT the paid layer. This is the funnel breaking on its own designed path once the flag flips. The
    CLAUDE.md "/result requireUser intentional" learning is misleading (conflates offer-card vs whole-page)
    and should be corrected by the fix pass.
  ▸ **fix-now (cheap, isolated, flag-independent — land before VALUE_FIRST_FUNNEL=true):** #1 `/result` anon
    wall (lenient resolver); #3 `/test/[id]` mint-during-render → 500 on cookieless direct-nav (use read-only
    getAnonUser like the layout); #4 `activation_aha` never fires for diagnostic/exam-first users (gate on
    first feedback+explanation answer, not global count===1); #5 `/pricing` missing its own auth re-assert.
  ▸ **add-test:** #7 vacuous checkout test (e); #8 checkout self-grant never adversarially exercised; #9 T5
    segment validators/actions untested.
  ▸ **fix-at-gate0 / PRODUCT DECISION for Danil:** #2 anon never sees the readiness dial move (contradicts
    the ADR's own value-first premise) — accept dial-as-post-registration (+fix ADR wording) OR give anon a
    read-only dial; #6 anon-User minting unbounded/un-GC'd (rate-limit + GC before public flip); #13 flag-ON
    HTTPS prod audit.
  ▸ **BY_DESIGN (no action):** readiness_aha per-render, stub-checkout unlinked, three-flag dev-only
    incoherence (prod-safe, deviation logged). **FALSE_POSITIVE:** "no payment line item" — it IS carried in
    PLAN.md + ADR. NEXT: a fix-now wave for #1/#3/#4/#5 + the 3 test gaps; #2/#6 fold into the Gate-0 wave.
- 2026-07-06 — **Wave 18 (funnel confirmed-defect fixes) DONE + verified.** The 4 fix-now defects + 3 test
  gaps from the Opus skeptic pass. 8 tasks / 10 ticks / $16, evaluator-gated, all Opus (Fable still daily-
  limited; planner added no Fable markers this time). Shipped: T1 `/result` no longer walls an anon at the
  FREE payoff — lenient READ-ONLY flag-aware resolver (real user → getAnonUser flag-on → requireUser flag-off),
  own-session-only (`findFirst where userId` + notFound = no IDOR), offer/dial-detail STILL gated on
  isDiagnostic/dialReal (anon sees score/review, never the offer); T2 `/test/[id]` uses read-only resolver
  (no mint/cookie-set in render → no 500 on cookieless direct-nav); T3 activation_aha fires on first
  feedback+explanation answer (not global count===1 → now counts diagnostic/exam-first users); T4 `/pricing`
  re-asserts requireUser; T5 checkout test (e) non-vacuous (fresh entitlement state); T6 adversarial
  self-grant case (foreign userId/tier → grant lands on session user, not injected); T7 T5 segment
  validators + actions covered. Also corrected the misleading CLAUDE.md "/result requireUser intentional"
  learning. Verify: typecheck 0 · **618 unit · 254 integration** · build · **flag-ON browser audit 98/98**
  (full anon funnel over real transport: segment→play→save-prompt→«Не зараз»→register→migration carries
  answers). REVIEW: given Fable-limited skeptics + a small already-skeptic-confirmed fix wave, the one
  security-sensitive change (the /result IDOR guard) was verified directly in code rather than via the
  half-failing saved wave-review — own-session scoping confirmed unambiguous. STILL DANIL'S CALL (Gate-0):
  #2 anon-sees-dial-move (product decision), #6 anon-row GC/rate-limit.
- 2026-07-06 — **Wave 18 adversarial wave-review (the one it skipped) — RUN, fully on Opus.** The saved
  `wave-review` was finally run over the Wave-18 diff (`f29f21d..49b41b5`) with BOTH layers on Opus
  (skeptic Verify layer parametrized `verifyModel`, passed `opus` because Fable is still daily-limited —
  first launch's Fable skeptics died on the limit, resumed from cache on Opus). **5 review lenses + 4
  Opus skeptics, 0 rejected.** WHAT HELD (independently source-verified, not via the wave's own tests):
  the crown-jewel /result + /test IDOR guard (own-session `findFirst where {id,userId}` → `notFound()`
  under BOTH flag states, no cross-user path), T2 no-mint read-only resolver, T3 activation_aha fire-once
  + diagnostic-cohort, T4 /pricing guard, T6 checkout self-grant guard, flag-OFF byte-inertness; the 6 new
  integration suites drive REAL production entry paths with literal oracles (not green-by-construction).
  **ONE confirmed defect (same issue via 4 lenses; severity major per the strictest):** the 399₴ offer
  gate (`result/page.tsx:61 showOffer`) + `readiness_aha` lack a `!user.isAnonymous` check — removing the
  requireUser() wall exposed that an anon who reaches a data-sufficient DIAGNOSTIC would see the PAID offer,
  violating the value-first invariant. Bounded (flag-OFF, no data/grant leak — CTA & checkout bounce anon)
  but MUST close before flipping the flag. Recorded: CLAUDE.md offer-gate learning CORRECTED (it falsely
  claimed authed-enforcement), fix queued as **`specs/wave-conversion-funnel.md` T3b** (reconcile w/ Gate-0
  product decision #3). No code changed this pass (finding is flag-gated + coupled to Danil's dial call).
- 2026-07-12 — **Wave 19a Part 2 + Wave 19b: readiness deep-dive → calibration pipeline + honesty redesign (fully autonomous run).** Deep-dive report `docs/research/READINESS-DEEP-DIVE-2026-07-12.md` → spec `specs/wave19b-readiness-honesty.md`. 19a-04..09 resumed and DONE (PassOutcome + migration; `lib/calibration-metrics.ts` Brier/LogLoss/ECE/reliability/Platt on hand-derived frozen oracles; `recordExamOutcome` self-only action; «Ти вже склав іспит у ТСЦ?» capture; read-only admin `/admin/calibration`). 19b all 11 tasks DONE (β-binomial pmf/tail lib vs scipy cross-check; `measureTopicCorrelation` estimator; BKT guess/slip-corrected grade inference replacing raw latency bands — scheduler math untouched, FSRS-6 vectors byte-identical; blueprint section bucketing fixed via stable questionKey — exam-blueprint integration test UN-skipped; READINESS_MIN_ANSWERS→MIN_SEEN consolidation; inputsJson rho/engine/calibratorId tags; dial «не гарантія» disclaimer). **Adversarial wave-review (5 lenses Opus + Fable skeptics, live-executed verification): 1 CRITICAL + 1 MAJOR confirmed, both fixed in `wave19b-hotfix` (ac5cf1e):** the headline ρ=0.35 TAIL variance inflation was direction-INVERTED for the real exam regime (raises a below-threshold student's dial, 3.5%→16.7% at mean 14/20 — threshold-above-mean fattens the upper tail), and the wave's own direction oracle had been fixture-scoped to hide it. Neutralized ρ→0 (dial = exact PB baseline again), added binding direction gate `lib/readiness-honesty.regression.test.ts` (live-constant-never-above-independence on the real 18/20 regime), corrected the backwards oracle framing + the lib/server/CLAUDE.md learning that normalized re-fixturing. Verify: typecheck 0 · **670 unit · 267 integration (0 skipped)** · build · migrate-diff drift EMPTY · **browser audit 82/82** over the real LAN transport (earlier 18/36-fail runs = documented daemon-cookie + dev.db-contention flake, proven by clean re-run). NEXT (**wave19c**): the CORRECT correlation penalty — estimation-side (effective-sample-size shrinkage of per-item p toward the prior / credible-lower-bound dial), math to be research-grounded with external oracles BEFORE implementation; ρ stays 0 until then (gate enforces).
- 2026-07-13 — **Wave 19c: estimation-side ρ correction (the CORRECT honesty penalty) — research → spec → harness → review, fully autonomous.** Math grounded first: deep-research workflow (103 agents, every claim 3-0 skeptic-verified vs primary sources — Kish/Rao-Scott n_eff, Jeffreys-under-clustering JSSAM 2017, Dean-Pagano monotonicity, LW/PB equivalence, Rothschild-Stiglitz rejection of draw-side inflation) → `docs/research/RHO-CORRECTION-RESEARCH-2026-07-12.json` + `specs/wave19c-estimation-side-rho.md` (frozen scipy oracles). Shipped (tasks 01–10, 33 ticks): `lib/beta-incomplete.ts` (regularized I_x/inverse, scipy-matched 6dp), `lib/readiness-estimation.ts` (`effectiveN` design effect, Jeffreys pseudo-posterior, `correctBlockMeanProb` min-clamped; tier **mean** LIVE, tier quantile implemented+parked), server wiring (per-block SEEN-count n_eff before `computeReadiness`; draw-side ρ stays 0), inputsJson `rhoEst/tier/nEff[]/dialIndep` (indep dial recorded per snapshot so PassOutcome calibration can pick the tier empirically), production-path direction test on BOTH populations. Direction guarantee (proof + gates): min-clamp ⇒ p̃≤p̂, PB tail monotone, mock anchor same-affine both dials ⇒ **dial ≤ independence baseline for every student** — weak no-op (0=0), strong binds (dialIndep 100 → dial 34; n_eff saturates ≈1/ρ=3.33 — real-outcome data may later justify softening ρ_est). Planner note: plan.sh timed out mid-plan; tail tasks 09/10 hand-authored (09's goal wording had a percent-vs-probability category error the driver corrected honestly — review confirmed the fix STRENGTHENED a vacuous assert). **Adversarial review: 0 defects, 1 minor (vacuous weak-side ≤) — fixed by pinning frozen magnitudes (0/0, 34/100).** Verify: typecheck 0 · **694 unit · 269 integration** · build · migrate-diff EMPTY · 19b honesty gate byte-untouched · **browser audit 82/82** (fresh build+server). The dial is now: exact PB + estimation-side correlation shrinkage + honest audit trail, calibration pipeline live to tune it on real ТСЦ outcomes.
- 2026-07-13 — **Waves 19d + 19e + hotfix: the readiness instrument corrected to ground truth (fully autonomous, Danil's "maybe it's the math?" as the trigger).** 19c's estimation shrink was confirmed STRUCTURALLY broken (Kish n_eff caps at 1/ρ ⇒ perfect-student ceiling 59%, top band unreachable) + three more instrument risks confirmed (R1 wrong blueprint quotas vs official; R2 studying lowers the dial; R3 slope-stacking). Ground truth first: official exam structure verified from hsc.gov.ua/zakon.rada.gov.ua (stratified draw **10 ПДР · 4 безпека · 4 будова · 2 домедична**; no finer quotas; unanswered=fail) → `docs/research/OFFICIAL-EXAM-STRUCTURE-2026-07-13.md`; correct math derived via deep-research (Lahiri–Mukherjee seen/unseen split, latent-factor GH mixture, Kish-misapplication diagnosis) → `HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json`. **19d shipped (10 tasks)**: official 4-strata blueprint in the dial AND the EXAM_SIMULATION composer; `scripts/oracles/gen-19d-oracles.py` (network-free Python reference) freezing SIX properties; `lib/readiness-release.ts` "lm-gh1" (seen items unshrunk, unseen slots at clamped Jeffreys C, ~20-node GH factor mixture with σ decaying in review mass, final=min(mixture,independence) BY CONSTRUCTION); 19c shrink retired. Release verified live: 0.95-rich 39%→92%, perfect 59%→100%. **19e (5 tasks)**: the Beta mock anchor RESTORED (19d-08 had dropped it behind a describe.skip + deferral note — the suspend-and-defer dodge, now evaluator REJECT trigger (f) in ~/mesa); anchor applied identically to both dials (preserves ≤); 3 silently-skipped suites repaired; integration skips back to 0. **Adversarial review (8 agents, max skepticism): every refutation target held** (oracle independently re-run, GH nodes vs numpy verbatim, blueprint against live seed, anchor both-ways binding) **except ONE MAJOR it caught: the nSeen=0 empty-stratum boundary** — TS diverged from its own frozen oracle (untouched stratum scored certain-wrong p=0, crushing dials; the ONE boundary every test avoided). Fixed in `4f08e7e` (oracle's n==0 branch implemented + boundary pinned incl. slope + degenerate cases; probe: untouched-medical strong student 31%, covering it →49% — honest gradient restored). Verify: typecheck 0 · **728 unit · 275 integration (0 skipped)** · build · **browser audit 82/82** · 19b honesty gate byte-intact through all three waves · draw-side ρ still 0. Campaign learnings encoded as evaluator triggers (e) fixture-dodging, (f) suspend-and-defer. NEXT: R4 (slip/Again grade inconsistency) own investigation · Wave C data-gated · dial-feel now a REAL taste call on honest numbers (Danil).
- 2026-07-14 — **Wave 20: grade-side honesty (R4 slip-adjusted lapse + honest guess floors) — the full 7-step campaign, fully autonomous.** Danil's trigger: the grade side (answer-click → FSRS state) never got the dial's instrument-level treatment. Step 2 numeric confirmation (`docs/research/GRADE-SIDE-PROBES-2026-07-13.md`) CORRECTED the deep-dive: real R4 crush = s=50 → 2.55 (50d→61h, not 0.3/7h), fix space BINARY-BROKEN (Hard(2) on wrong GROWS s 50→63.4), D1 UPGRADED (only 20% of bank is 4-option; 2-opt 21% / 3-opt 47% / 5-opt 11.5%), ReviewLog has NO correct column, latency data-gated (44 rows all <2s). Step 3 dual deep-research (both adversarially verified, Opus grunts after the tiering-guard fail-open hole was found+closed): mechanism report (`GRADE-MECHANISM-RESEARCH-2026-07-13.md`) — Baker/Corbett/Aleven contextual-slip is mainstream prior art (P(slip) RISES with mastery 0.10→0.27), do-NOT-skip-update (CGS r=0.289 vs 0.430), log-the-TRUE-grade (FSRS docs: mislabeled Hard inflates all intervals) which PRESERVES correct⟺grade≥2 (no migration!), 2-opt g=0.5 sits ON the BKT degeneracy boundary; beyond-current survey (`BEYOND-CURRENT-RESEARCH-2026-07-13.md`) — top-3: Elo item difficulty (~200 ans/item), per-user FSRS weight fitting (ReviewLog already sufficient), exam-date-aware allocation = genuine WHITE SPACE (our PB dial as objective); questions D/F (RT/confidence signals, pedagogy) got ZERO surviving claims — open. Blend space settled LOCALLY (research couldn't): LOG-space geometric blend, LINEAR excluded (grows s 5→8 on half-forgotten at π=0.135), cap S'≤prior REQUIRED (π>0.926 reachable at 2-opt R=0.99). **Wave 20 shipped (9 tasks, one run-all)**: `scripts/oracles/gen-wave20-oracles.py` freezing (a)–(g) 6dp; `lib/fsrs/lapse-adjust.ts` `slipAdjustedLapse` (Again arm + capped log-blend stability only, `schedule()` byte-untouched); `g=min(1/optionCount, FSRS_GUESS_MAX=0.45)`; optionCount threaded submitAnswer→recordReview (zero extra reads); engine `fsrs6-bkt2`; direction gates + live population pre-verify (`GRADE-SHIFT-NOTE-2026-07-14.md`: 68.1% of bank flips fresh-correct Good→Hard, first intervals 2.31d→1.29d — honest, intended); integration proof (s=50+10d wrong ⇒ S'≈36.3 ∈[30,45], relearning, lapse++, logged grade 1); oracle caught the spec's own eyeballed crush bound (×1.6 → model-measured ×2.2444, grid-swept). Independent verify: typecheck 0 · **759 unit · 279+1 integration (0 skipped)** · build · restart · **browser audit 82/82**. **Adversarial review (PROCEED-WITH-CHANGES): all 9 refutation targets HELD** (cap binds exactly max-ratio 1.000000 over 6000-pt grid; 2.2444 independently re-derived — not oracle-weakening; FSRS-6 vectors + 19b honesty gate byte-empty diff) **except ONE MAJOR: the sessionless offline SRS lane** (`applySessionlessReview`) omitted optionCount — live-vs-offline grade divergence on 68% of bank; fixed same night `2126077` + lane-parity pin (review-sync (n)); learning: recordReview has MULTIPLE callers — grep them all. (Review's tests-quality lens died on a structured-output retry cap — its scope was covered by production-path; noted, not re-run.) NEXT: **study-plan/dial re-validation under the new queue volume** (review scope note: daily-dose math + «N днів × M питань» honesty promise were tuned under the all-Good regime) · beyond-current backlog (Elo difficulty spike → weight-fit harness → exam-date allocator sim-first) · R4-adjacent D3/D4/D5 stay data-gated · dial-feel taste call (Danil, honest numbers now).
- 2026-07-14 — **Wave 21: study-plan honesty (the quota-explosion fix) — the wave20 review's scope note, resolved.** Re-validation probe FIRST (`docs/research/PLAN-REVALIDATION-2026-07-14.md`, real-engine simulation 45/60/90d): wave20's grading shift needs NO plan re-tuning (week-1 quotas equal-or-lower; total reviews −1..−8% at realistic accuracy — the slip-adjusted lapse SAVES churn; onboarding first-plan numbers identical), BUT the probe surfaced a PRE-EXISTING formula defect: `ceil((unseen+due)/daysLeft)` models due reviews as one-shot work while they regenerate → displayed quota explodes to ~600/день in the last days of every horizon + «Не встигнете» shown 35–42 days per horizon to users doing everything right (the maintenance branch was unreachable). **Wave 21 shipped (8 tasks, one run-all, zero rejects)**: `scripts/oracles/gen-wave21-oracles.py` (86 frozen checks); new pure model in `lib/study-plan.ts` — unseen=one-shot, reviews=FLOW: `quota = ceil(unseen/max(1,daysLeft)) + reviewLoad`, reviewLoad = Σ 1/max(1,stability) over seen cards (computed in getStudyPlan's EXISTING ReviewState scan, zero new queries), PRIORITIZE class (clamped ≤40, no threat copy) replaces infeasible-«Не встигнете», MAINTENANCE class for unseen==0 (calm «повторюйте ~N», intentionally unclamped — honest flow), exam-today keeps semantics; fresh-user EQUALITY ANCHOR (reviewLoad=0 ⇒ new≡old formula — onboarding untouched); sim direction gate drives the REAL model+FSRS (old formula proven to explode on the gate's own pool, new stays ≤40). Independent verify: typecheck 0 · **778 unit · 282 integration (0 skipped)** · build · **browser audit 84/84** (+2 plan-card asserts incl. absent-«Не встигнете за»). **Adversarial review: ZERO confirmed findings** — all 9 refutation targets held under live re-derivation (anchor triangulated against the independently-computed old formula; clamp mutation-tested; reviewLoad 6dp re-derived by hand; stability=0 guard confirmed; lib/fsrs + readiness + calibration byte-empty diff; 19b gate green). NEXT: beyond-current backlog (Elo difficulty · weight fitting · exam-date allocator) · dial-feel taste (Danil) · CLAUDE.md learnings prune (32>30 cap).
- 2026-07-14 — **Wave 22: Elo item-difficulty estimation (beyond-current #2 — estimator early, consumers gated).** First wave of the forward chain (Danil: "do the remaining forward work"). Shipped (10 tasks; one full limit-park + reactivate cycle mid-run — account session limit, standard flip-to-active recovery): `scripts/oracles/gen-wave22-oracles.py` (guess-adjusted Rasch/Elo `P = g+(1−g)·σ(θ−β)` with the wave20 `g=min(1/oc,0.45)` floor, uncertainty-adaptive `K(n)=K_MAX/(1+n/HALFLIFE)`, fold determinism + ORDER-SENSITIVITY documented, convergence + guess-direction + K-decay properties, all 6dp); pure `lib/elo.ts` (`eloUpdate`/`foldEloStream`, injected params); constants (`ELO_MIN_ITEM_ANSWERS=200`, `ELO_CONSUMERS_ENABLED=false` — NOTHING learner-facing reads β this wave); additive migration `Question.eloBeta/eloAnswerCount` (hand-authored 2×ADD COLUMN, migrate-diff drift EMPTY); `lib/server/elo.ts` full deterministic replay + ≤200-id chunked writeback; nightly job extension + `scripts/elo-recompute.ts`; admin content-health Elo column with n<200 marker. Independent verify: typecheck 0 · **786 unit · 284 integration (0 skipped)** · build · migration applied · recompute smoke · **browser audit 84/84** (first run 76/8 + a 59/25 = the DOCUMENTED agent-browser daemon cookie-drop flake, twice — clean daemon restart → 84/84; app code was never at fault). **Adversarial review: every target held** (oracle re-derived bit-for-bit incl. the reversed-stream literal; guess-direction confirmed ALGEBRAICALLY dP/dg=1−σ>0; isolated-subgraph invariance proven sound; idempotency live 2×97 rows byte-identical; consumers grep-confirmed off; migration additive; nightly intact) **except ONE MAJOR it caught: the fold read `TestAnswer` — the UPSERTED FINAL choice with last-touch answeredAt — while claiming first-attempt semantics** (invisible to the wave's own golden test: its fixture never changes an answer). Fixed same hour `b4f231c`: source swapped to **ReviewLog** (the true first-attempt record, `correct ⟺ grade≥2`), divergence PINNED (final-correct TestAnswer + grade-1 ReviewLog ⇒ β>0), WRITEBACK_CHUNK comment rationale corrected. Learning: "mirror FSRS" claims must read FSRS's OWN record, and @@unique(session,question) ≠ first-attempt (upsert!). Also this session: D/F research re-run landed (`docs/research/SIGNALS-PEDAGOGY-RESEARCH-2026-07-14.md` — interleaving g=0.29 bias-corrected + feedback g=0.73-vs-0.03 = BUILD-grade; first-instinct fallacy myth = capture-only; expressive writing = failed replication SKIP; confidence/mock-cadence/pretesting still open). NEXT in chain: wave23 exam-allocator SPIKE → wave24 weight-fit harness.
- 2026-07-14 — **Wave 23: exam-date allocator SPIKE — measured, verdict NO-GO, white space honestly closed.** The beyond-current survey's top-upside item (nobody publishes fixed-date pass-prob-maximizing review allocation) got its sim-first measurement (8 tasks, ~$21): independent python oracle (PB/mixture/split re-encoded, never importing TS); pure `lib/exam-allocator.ts` (greedy dial-delta: expected `releaseDial.final` delta per candidate, real wave20 grade path both arms); `lib/exam-allocator-sim.ts` harness — 18 cells (weak/median/strong × 14/30/60d × 15/30 budget) × 50 replicas, seed-42 byte-deterministic, PAIRED per-replica lifts, baseline = the REAL `selectReviewQueue`. **Result (`docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md`): below-threshold mean lift −0.27pp (gate ≥+2pp) and one significantly HARMED cell (weak·30d·15/day: −1.20pp, CI [−1.88,−0.53]) — both gate conditions FAIL. Diagnosis: exam pass-prob is COVERAGE-bound, not ordering-bound** (14/18 cells saturate ≥99%; in the tight cells both arms spend the identical unseen budget and seen-lane re-ranking has nothing to move). Population NOT re-fixtured; the loss IS the finding (the wave19b discipline, held). **Adversarial review INVERTED (refute the NO-GO): zero confirmed findings** — paired-CI methodology confirmed, baseline fairness confirmed, gate power adequate, determinism live-pinned, nothing wired to production (queue byte-untouched, all prior oracles byte-empty diff). Independent verify: typecheck 0 · **799 unit · 284 integration** · build. PRODUCT CONSEQUENCE: `selectReviewQueue` stands; the allocator is NOT wired; the only future direction worth a NEW gated spike is **coverage-first unseen-lane allocation under tight budgets** (the binding constraint the sim exposed). NEXT: wave24 weight-fit harness (last chain item).
- 2026-07-15 — **Wave 24: per-user FSRS weight-fit harness — built, validated on synthetic ground truth, chain COMPLETE.** The last forward-chain item (survey finding #1). Shipped (10 tasks + orchestrator hand-fixes; one Opus-outage park/reactivate + two judge-glitch parks resolved): `scripts/fsrs-fit/` = pinned venv (py-fsrs 6.3.1) · `fit.py` (canonical Optimizer, never hand-rolled) · `evaluate.py` (Scheduler replay + independent python retrievability, cross-checked vs our TS to <1e-6) · `export-logs.ts` (engine="fsrs6-bkt2" segmentation filter) · `param-engine.ts` (weight-injectable engine mirror, oracle-pinned ===schedule() ≤1e-9) · `gen-synthetic.ts` (deterministic LCG generator) · `run-validation.ts` (RECOVERY/NULL/CURVE gates). **The external oracle WORKED: the first run honestly FAILED RECOVERY(ii)** — w20 pinned at the optimizer's 0.1 bound because due-only cadence samples the forgetting curve at a single point (R≈0.9 ⇒ (S,w20) degenerate). Instrument fixes: 35% overdue spread log-uniform 1.5–120× (the curve is a FLAT power law — R≈0.5 needs ~90× lateness); 1-year interval cap (Date-range overflow on success streaks); CARDS 20→200 (realism — the absorbing-state degeneracy was pre-spread-only, per review correction); 5%-slip alternative tried and REJECTED (label noise breaks recovery). NULL gate premise-corrected to the RELATIVE form (null_improvement ≤ max(0.005, 0.35×recovery) — the absolute 0.005 sat inside a real seed-stable ~0.002–0.006 in-population adaptation band). **Final: ALL FOUR GATES PASS** (recovery logloss 0.206→0.178; w20 0.1542→0.1730 toward true 0.18504; ratio 0.22; curve err 0.066@200→0.012@2000). **Adversarial review (attacking MY hand-fixes as potential green-chasing): all held, verified live** — results reproduced byte-for-byte, physics re-derived, null premise corroborated at TWO reviewer-chosen seeds (88888 would have FALSE-FAILED the old absolute gate while recovering w20 to 0.1817), independence + byte-untouched confirmed; ONE minor narrative correction applied (`0873505`: pool bump = realism, not remedy). Verify: typecheck 0 · **809 unit · 285 integration** · whole-wave gate PASS. PRODUCT CONSEQUENCES (docs/research/WEIGHTFIT-HARNESS-2026-07-14.md): data gate ≈ **≥1000 fsrs6-bkt2 reviews/user** for full-vector fits (stricter than ~400 folklore); the future live wave must ALSO check per-user retrievability SPREAD (an always-on-time reviewer is w20-unidentifiable); expected holdout gain ceiling ~0.019-0.029. NOTHING wired live. **FORWARD-WORK CHAIN (Danil 2026-07-14 "do the remaining stuff") COMPLETE: waves 22 (Elo shipped+gated) · 23 (allocator NO-GO, honest) · 24 (fit harness validated) + D/F research landed + housekeeping.** NEXT: Danil's items (dial-feel taste · lpv merge · Gate-0) · future data-gated waves (Elo consumers at n≥200/item · weight-fit at ≥1000 reviews/user · coverage-first unseen-lane spike) · interleaving/feedback pedagogy candidates (SIGNALS-PEDAGOGY report, BUILD-grade evidence).
