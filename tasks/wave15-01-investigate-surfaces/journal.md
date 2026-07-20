# Task: wave15-01-investigate-surfaces

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T14:45Z
**Last compute:** mac-mini

## Goal
INVESTIGATION ONLY — no production code changes. Map every surface Wave 15
(specs/wave15-practice-modes.md) touches and record findings in THIS journal under `## Findings`.
PASS = ALL true:

1. `## Findings` exists and answers each of the following, with file:line pointers:
   a. `startSession` (lib/server/test-engine.ts): the exact branch insertion point for the four new
      modes (where ADAPTIVE_REVIEW/SPACED_REVIEW branch today, ~:72-73); confirm `startTestSchema`
      (lib/validation.ts:49-50) derives `mode` from `STARTABLE_MODES` so NO validation edit is needed
      once constants grow (wave15-02).
   b. `lib/server/study.ts` reuse surface: `loadReviewCandidates` (what it selects today; what must be
      ADDED additively for SIGN_TRAINER — topic.displayOrder — and DIAGNOSTIC — Question.difficulty),
      `createReviewSession` (mode param type, `test_started` event), `resolveReviewSize`.
   c. TestSessionQuestion ordering: how getSessionState / the /test/[id] page order questions
      (displayOrder), the EXACT element shape of TestRunner's `questions` prop (needed to freeze the
      extendSession return contract in wave15-08), and how an append must number new rows
      (max displayOrder + 1).
   d. `submitAnswer`: exact lines of the `showsImmediateFeedback` gate and BOTH return shapes; confirm
      recordReview + bumpStudyDay fire for every mode on the single write path; whether getSessionState
      or the /test/[id] page delivers any per-option correctness to the client pre-finish for non-exam
      modes (matters for DIAGNOSTIC withholding, wave15-09).
   e. `components/test-runner.tsx`: enumerate EVERY `isExam` conditional site with line numbers,
      classifying each as (i) reveal-withholding (must ALSO apply to DIAGNOSTIC) vs (ii) exam-only
      (Timer/deadline — must NOT apply to DIAGNOSTIC); plus where a MARATHON refill trigger + rolling
      counter fit (footer/progress area) and where the finish-button visibility gate
      (`isLast || isExam`) lives.
   f. Result page `app/(app)/test/[id]/result/page.tsx`: structure; where a DIAGNOSTIC-only finish
      section mounts; how the dashboard assembles ReadinessDial props from getLatestReadiness
      (file:lines, incl. READINESS_MIN_SEEN — note whether 15 diagnostic answers can EVER reach
      sufficientData=true, i.e. is READINESS_MIN_SEEN <= 15).
   g. Onboarding `app/(app)/onboarding/page.tsx`: the step-flow lines; where a post-category-select
      DIAGNOSTIC CTA belongs; the exact prisma query to detect a COMPLETED DIAGNOSTIC session for the
      guard (NO new schema).
   h. Dashboard: where the wave14 NudgeCard mounts (page lines) and a recorded decision: reuse
      NudgeCard vs a sibling quiet Card for the DIAGNOSTIC nudge (wave15-13), with why.
   i. Sign pool reality check against dev.db (sqlite3): do Topics with displayOrder 132 (§33 знаки)
      and 133 (§34 розмітка) exist; counts of PUBLISHED questions in each; count of published cat-B
      questions with imageKey IS NOT NULL. Record the literal numbers.
   j. Difficulty reality check: `SELECT difficulty, COUNT(*) FROM Question GROUP BY difficulty`
      (record values). If all rows share one value, note that DIAGNOSTIC easy→medium ordering is
      currently VACUOUS at runtime (the unit oracle still binds) — record in Risks.
   k. Finish/analytics path: where finishSession's status flips to COMPLETED (idempotent early-return
      lines) — the single point where `diagnostic_completed` must be recorded exactly once (wave15-14).
   l. `bin/browser-audit.sh`: section layout (numbered sections; seeded vs fresh-user split), the
      multi-form «Почати» eval-click discriminator pattern (wave12b-17), the exam answer-loop idiom
      reusable for MARATHON's 18-answer flow, and where three new mode sections fit (wave15-15).
2. `## Risks` lists at least: the wave12b-10 stale-server/rebuild audit trap; the client-bundle trap
   for the runner's refill (must import the "use server" ACTION, never lib/server); the P2029 rule for
   MARATHON exclusion (JS set-diff, never a giant notIn); EVERY `Record<TestMode` / exhaustive-switch
   site that breaks when TEST_MODES grows (grep, file:line — wave15-02 consumes this list); the
   difficulty-vacuous risk from (j).
3. NO production changes: `git status --porcelain` shows nothing new outside `tasks/` (pre-existing
   dirt: scripts/restyle/state.json, _composite_t.mjs, _sheet.mjs, _zoom.mjs).

## Constraints / decisions
- Investigation is separate from implementation (planner method) — do NOT fix or implement anything.
- Downstream tasks (02–15) consume these findings in fresh contexts — precise file:line pointers.
- dev.db queries are read-only (sqlite3 SELECT only).

## Next
- [x] DONE — investigation complete. Downstream tasks 02–15 consume `## Findings`/`## Risks` below.
      (If a reviewer flags a gap, re-open and add the missing pointer.)
- [x] FIXED verify FAIL: the "no production changes" gate had tripped on a stray `M CLAUDE.md`;
      working tree is now clean and `verify.sh` returns `OK wave15-01`. Do NOT append a CLAUDE.md
      learning for THIS task — its verify gate forbids any non-`tasks/` change, incl. CLAUDE.md.

## Findings

### (a) `startSession` branch point + validation
- `lib/server/test-engine.ts:72-73` — the ADAPTIVE_REVIEW/SPACED_REVIEW early-return branches:
  `if (mode === "ADAPTIVE_REVIEW") return startAdaptiveReview(...)` / `... "SPACED_REVIEW" ... startSpacedReview(...)`.
  **The four new modes branch HERE** (same shape: `if (mode === "QUICK") return startQuick(userId, categoryId, ...)`, etc.),
  BEFORE `baseWhere` is built at `:75`. They bypass the generic `selectQuestions` path exactly like the review modes.
- `lib/validation.ts:49-52` `startTestSchema` derives `mode` via `z.enum(STARTABLE_MODES, …)`. `STARTABLE_MODES = TEST_MODES`
  (`lib/constants.ts:31`). **NO validation edit needed** once `TEST_MODES` grows in wave15-02 — the enum widens automatically.
- `startTestAction` (`app/actions/test.ts:26-52`) reads `mode`/`topicId` from FormData, `safeParse`s, and calls `startSession`.
  It maps `NothingDueError`→`/practice?empty=SPACED_REVIEW` (`:47`) and `NoQuestionsError`→`/dashboard?empty=<mode>` (`:48`).
  New modes get NoQuestionsError handling for free; any new "empty" redirect target must be added here.

### (b) `lib/server/study.ts` reuse surface
- `loadReviewCandidates` (`study.ts:211-248`): today `SELECT id, topicId` for every published category question
  (`SERVABLE`-shape where at `:216-223`), then joins the user's `ReviewState` (via `where:{userId}` scan `:225`) and
  `TopicMastery` band→weakness (`:228-234`), returning `QueueCandidate[]` (`questionId, topicId, topicWeakness, state`).
  - **SIGN_TRAINER** needs `topic: { select: { displayOrder: true } }` added to the `select` (additive) so the pool can be
    filtered to sign topics; ALSO `imageKey` (for image-bearing questions). Do NOT add an id-list `in` (P2029).
  - **DIAGNOSTIC** needs `difficulty` added to the `select` for the easy→medium ordering (currently absent).
  - QUICK/MARATHON reuse `loadReviewCandidates` AS-IS (they only need the FSRS `state` the picker scores).
- `createReviewSession` (`study.ts:260-284`): mode param is the LITERAL union `"ADAPTIVE_REVIEW" | "SPACED_REVIEW"` (`:263`) —
  **must widen** to include the new queue-driven modes (QUICK/MARATHON/SIGN_TRAINER; DIAGNOSTIC persists its own way). Emits
  `recordEvent("test_started", …)` (`:278`) — the single start event; do NOT double-emit.
- `resolveReviewSize` (`study.ts:251-257`): `profile.dailyGoal || ADAPTIVE_REVIEW_SIZE(15)`. QUICK/SIGN_TRAINER/DIAGNOSTIC use
  their OWN preset counts (`QUICK_COUNT=10`, `SIGN_TRAINER_COUNT=20`, `DIAGNOSTIC_COUNT=15`), NOT this size.
- `selectReviewQueue` (`lib/test-engine/queue.ts:150`) is the PURE picker: options `{now, rng, size, newItemShare, backfillWithNew}`.
  QUICK preset = `{size:10, newItemShare:0.4 (→4 new), backfillWithNew:true}`; MARATHON-page = `{size:20, backfillWithNew:true}`.

### (c) TestSessionQuestion ordering + append + runner contract
- `getSessionState` (`test-engine.ts:246-313`) loads `questions` `orderBy:{displayOrder:"asc"}` (`:252`); each element has the FULL
  shape at `:288-311` (`questionId, displayOrder, text, imageUrl, imageKey, topicId, topicTitle, isDemo, options[{id,text,isCorrect?}],
  explanation, answered, selectedOptionId, isCorrect, saved`).
- `/test/[id]/page.tsx:18-29` maps that to the **RunnerQuestion contract** (`components/test-runner.tsx:18-29`):
  `{questionId, text, imageUrl, imageKey, topicTitle, isDemo, options:[{id,text}], answered, selectedOptionId, saved}`.
  **wave15-08 `extendSession` must return NEW rows in EXACTLY this RunnerQuestion shape** (map through getSessionState-style
  loading of the appended questions' full rows + options, `isCorrect` OMITTED).
- **Append numbering**: new `TestSessionQuestion.displayOrder = (max existing displayOrder) + 1, +2, …`. Get max via
  `prisma.testSessionQuestion.aggregate({where:{testSessionId}, _max:{displayOrder:true}})` (or `findFirst orderBy desc`).
  Respect `@@unique([testSessionId, questionId])` — exclude already-present question ids. Also bump `TestSession.totalQuestions`.

### (d) `submitAnswer` gate + return shapes + reveal
- `showsImmediateFeedback(mode)` (`test-engine.ts:240-242`) = `mode !== "EXAM_SIMULATION"`. **wave15-09: flip DIAGNOSTIC to withheld**
  → change to `mode !== "EXAM_SIMULATION" && mode !== "DIAGNOSTIC"` (or a set membership). This one predicate governs BOTH the
  submit return AND the runner (imported at test-runner? no — runner uses its own `isExam`; see (e)).
- Return shapes (`test-engine.ts:453-461`): withheld → `{recorded:true}` (`:454`); otherwise
  `{recorded:true, isCorrect, correctOptionId, explanation}` (`:456-461`). Flipping DIAGNOSTIC makes its submit return the withheld shape.
- `recordReview` (`:416-432`) + `bumpStudyDay` (`:439`) fire inside the FIRST-ATTEMPT guard (`if (!priorAttempt)` `:404`), **mode-independent**
  — so ALL new modes seed ReviewState + count toward streak/goal automatically (satisfies "DIAGNOSTIC seeds ReviewState", "QUICK counts toward daily goal").
- **Pre-finish correctness leak check**: `getSessionState` sets `reveal = session.status === "COMPLETED"` (`:267`) and gates
  `options.isCorrect` (`:303`) + `explanation` (`:305`) on it — so the client NEVER receives correctness for an IN_PROGRESS session in
  ANY mode. The ONLY per-answer correctness delivered pre-finish is `submitAnswer`'s return value. Withholding DIAGNOSTIC = making that
  return the `{recorded:true}` shape (via the (d) flip). No page/getSessionState change needed for withholding.

### (e) `components/test-runner.tsx` — every `isExam` site
- `:80` `const isExam = mode === "EXAM_SIMULATION"` — the definition. **For DIAGNOSTIC (exam-style reveal) prefer a derived
  `withheld = mode === "EXAM_SIMULATION" || mode === "DIAGNOSTIC"`** and use it at the reveal sites (i) but NOT the timer site (ii).
- REVEAL-WITHHOLDING sites (must ALSO apply to DIAGNOSTIC):
  - `:120` `const locked = !isExam && Boolean(fb)` — practice locks after answer; exam/diagnostic never gets `fb` so already effectively unlocked (allows re-selection). Use `withheld`.
  - `:242` `if (!isExam && "isCorrect" in res)` — only sets feedback for non-exam. DIAGNOSTIC's submit won't return `isCorrect` (per (d)) so `"isCorrect" in res` is already false; changing to `!withheld` is belt-and-suspenders.
  - `:448-453` the `if (fb)` correctness marker block — no `fb` ⇒ no leak (driven by server).
  - `:537` `mode !== "EXAM_SIMULATION"` confidence chip suppression — DIAGNOSTIC should also suppress (use `!withheld`).
- EXAM-ONLY sites (must NOT apply to DIAGNOSTIC — no timer/deadline):
  - `:387` `{isExam && deadlineMs && <Timer …/>}` — Timer. DIAGNOSTIC has `deadlineMs=null` anyway (no `timeLimitSeconds`), so keep the literal `isExam` here.
  - `:673` `{isExam && <p>Відповіли на N з …</p>}` — exam-only footer count. Keep `isExam`.
- **Finish-button visibility gate**: `:622` `{(isLast || isExam) && <Button>Завершити тест</Button>}`. **MARATHON** (endless) needs the
  finish button ALWAYS visible → widen to `(isLast || isExam || isMarathon || withheld)`. DIAGNOSTIC is finite (15) so `isLast` covers its
  end, but exam-style «Завершити» always-on is harmless.
- **MARATHON refill trigger + rolling counter** fit in the sticky chrome (`:377-394`): the counter `«N відповідано · точність X%»`
  goes in the top row near `:379-386`; the refill effect watches `answeredCount`/`idx` vs `questions.length` and calls the
  `extendSession` action when `questions.length - answeredCount <= 3` (wave15-11). `answeredCount` already computed at `:118`.

### (f) Result page + readiness dial
- `app/(app)/test/[id]/result/page.tsx`: `isExam = session.mode === "EXAM_SIMULATION"` (`:27`); structure = header (`:44-54`),
  score `Card` (`:56-76`), Svitlyk encouragement `Card` (`:81-99`), re-run/CTA row (`:101-116`), wrong-topics `Card` (`:118-142`),
  per-question разбір (`:144-194`). **DIAGNOSTIC-only finish section mounts as a new branch high in the page** (e.g. after the header
  `:54`, replacing/adjacent to the score card): reuse `ReadinessDial` + a named-weakest-topic line + a plan CTA. Gate on
  `session.mode === "DIAGNOSTIC"`.
- Dashboard assembles `ReadinessDial` props (`app/(app)/dashboard/page.tsx:207-214`) from `getLatestReadiness(user.id, categoryId)`
  (`:101`): `{sufficientData, seenCount, dialPercent, bottleneckTopicId, snapshot.bottleneckTitle}` (return shape in
  `lib/server/mastery-readiness.ts:326-350`; `minSeen={READINESS_MIN_SEEN}` passed literally at dashboard `:211`).
- **`READINESS_MIN_SEEN = 20` (`lib/constants.ts:116`) > 15.** So a 15-question DIAGNOSTIC can NEVER reach `sufficientData=true`
  on its own (`sufficientData = seenCount >= READINESS_MIN_SEEN`, mastery-readiness.ts:276). The diagnostic finish MUST show the
  HONEST insufficient-data dial state (spec §D explicitly anticipates this) — never a fabricated percent. The dial already renders
  the insufficient state (`readiness-dial.tsx`, proven by audit 9a «Ще недостатньо даних»). Weakest-topic for the finish comes from
  the DIAGNOSTIC's OWN answers (new pure `weakestTopicFromAnswers`, wave15-14), NOT from `getLatestReadiness` (which needs a snapshot).

### (g) Onboarding DIAGNOSTIC entry + guard
- `app/(app)/onboarding/page.tsx`: `?step=` router (`:50-51`), step 1 = category select form → `selectCategoryAction` (`:162-184`),
  steps 2/3 optional (exam date/daily goal), `step=done` = first-plan screen (`:53-75`) with `<LinkButton href="/dashboard">До навчання</LinkButton>` (`:71`).
- **DIAGNOSTIC CTA belongs on the `step=done` screen** (after category is chosen), alongside «До навчання» — CTA copy per spec §D:
  «Дай нам 3 хвилини — покажемо, з чого почати». It posts a `<form action={startTestAction}><input name=mode value=DIAGNOSTIC>`.
  (Category is already persisted by step 1, so DIAGNOSTIC's `categoryId` resolves from `user.selectedCategoryId`.)
- **Guard query** (no new schema): `prisma.testSession.findFirst({ where: { userId: user.id, mode: "DIAGNOSTIC", status: "COMPLETED" }, select: { id: true } })`
  — non-null ⇒ user already did a diagnostic; hide the CTA (and the dashboard nudge in (h)).

### (h) Dashboard DIAGNOSTIC nudge decision
- The wave14 `NudgeCard` mounts at `app/(app)/dashboard/page.tsx:249` (`{nudge && <NudgeCard nudge={nudge} dismissAction={dismissNudgeAction} />}`),
  fed by `computeDueNudges` (`:142`) which is coupled to `NUDGE_KINDS` + `NotificationLog` dedupe + weekly-cap policy (`lib/nudge-policy.ts`).
- **DECISION: use a SIBLING quiet `Card`, NOT `NudgeCard`.** Reusing NudgeCard would force a new `NUDGE_KIND`, a policy branch, and a
  `NotificationLog` dedupe key — heavy plumbing for a static "you've never done a diagnostic" prompt. A plain gentle `Card`
  (gated on the (g) guard query returning null AND `user.selectedCategoryId` set) linking to a DIAGNOSTIC-start form is lighter,
  additive, and needs zero policy/schema change. Mount it near the readiness dial hero (`:205-218`).

### (i) Sign pool reality check (dev.db, read-only)
- Topic displayOrders (VERIFIED against dev.db):
  - `130 МІЖНАРОДНИЙ РУХ` · `131 НОМЕРНІ, РОЗПІЗНАВАЛЬНІ ЗНАКИ, НАПИСИ І ПОЗНАЧЕННЯ` · `132 ТЕХНІЧНИЙ СТАН …` (18 published) ·
    `133 ОКРЕМІ ПИТАННЯ … УЗГОДЖЕННЯ` (5 published) · **`134 ДОРОЖНІ ЗНАКИ` (357 published)** · **`135 ДОРОЖНЯ РОЗМІТКА` (35 published)** ·
    `138 НАДАННЯ ДОМЕДИЧНОЇ ДОПОМОГИ`.
- **⚠ THE SPEC'S NUMBERS ARE WRONG.** Spec §Mode-contracts says "§33 signs (Topic displayOrder 132) + §34 markings". In the ACTUAL seeded
  DB, displayOrder **132 = ТЕХНІЧНИЙ СТАН** (technical state, NOT signs) and **133 = ОКРЕМІ ПИТАННЯ** (special questions, NOT markings).
  The real sign/marking topics are **displayOrder 134 (ДОРОЖНІ ЗНАКИ) + 135 (ДОРОЖНЯ РОЗМІТКА)**. SIGN_TRAINER (wave15-06/07) MUST filter
  on displayOrder **134/135** (optionally also `131` НОМЕРНІ ЗНАКИ), NOT 132/133 — using 132/133 would drill technical-state + special
  questions. See Risk below (blueprint +99 offset) for why the numbers drifted.
- imageKey-bearing published questions: **1078 total (all categories); 986 in category B** (`imageKey IS NOT NULL AND published`).
  So the SIGN_TRAINER "image-bearing" arm alone yields a large cat-B pool (986) — the 20-question preset never underfills for cat B.

### (j) Difficulty reality check
- `SELECT difficulty, COUNT(*) FROM Question GROUP BY difficulty` ⇒ **`1 | 2322`** — EVERY question has `difficulty = 1` (same for the
  published-only subset). **DIAGNOSTIC's easy→medium ascending-difficulty ordering is VACUOUS at runtime** (all ties) today. The pure
  unit oracle (wave15-05) still BINDS because it injects candidates with varied `difficulty` — implement the ascending sort correctly;
  it just has no observable effect on the live seed until difficulties are authored. Recorded in Risks.

### (k) Finish / analytics single-flip point
- `finishSession` (`test-engine.ts:465-520`): the status→COMPLETED flip is `prisma.testSession.update({… status:"COMPLETED", finishedAt …})`
  at `:499-508`, guarded by the IN_PROGRESS idempotency check at `:475-488` (a repeat finish on a COMPLETED session early-returns the
  stored summary at `:481-487`, re-driving only `finalizeSession`). **`diagnostic_completed` (wave15-14) records EXACTLY ONCE right after
  the flip, alongside the existing `recordEvent("test_completed", …)` at `:510`**, inside the IN_PROGRESS branch (so the early-return path
  can't re-fire it): e.g. `if (session.mode === "DIAGNOSTIC") void recordEvent("diagnostic_completed", userId, { sessionId });`.
  Add `"diagnostic_completed"` to `ANALYTICS_EVENTS` (`lib/constants.ts:150-172`) FIRST (recordEvent rejects unknown names).

### (l) `bin/browser-audit.sh` layout
- Numbered sections 0–16 (order on disk is 0,1,1b,2,2b,3,4,5,6,7,8,9,9a,9b,10,11,16,16a–f,12,13,14,15). Seeded lane uses
  `DS_USER=user@drivers.school`/`User12345` (`:25-26`); FRESH-user lane registers `audit-<epoch>@drivers.school` (section 9, `:181-202`).
- **Multi-form «Почати» eval-click discriminator** (wave12b-17), line `:219`:
  `document.querySelector("input[name=mode][value=SPACED_REVIEW]").closest("form").querySelector("button").click()`. Reuse this pattern for
  the QUICK/MARATHON/SIGN_TRAINER cards (`value=QUICK` etc.).
- **Exam answer-loop idiom** (reusable for MARATHON's ~18-answer flow), `:245-250`: `while [ q -lt 20 ]; "$AB" find role radio click; sleep 1;
    "$AB" find text "Далі" click; q++`. For MARATHON, loop enough to cross the ≤3-left refill threshold and assert `questions.length` grew
  (or a new question index appears) before finishing.
- **New mode sections** (wave15-15) fit as a dedicated block after section 3 (the authed-pages loop, `:141-145`) or appended before the
  final Wave-13 PWA sections — each: `nav "$ORIGIN/practice"`, eval-click the mode's discriminator, `assert_url "/test/"`, answer one via
  `find role radio click`. Restart :3100 after `npm run build` first (see Risk 1).

## Risks
1. **wave12b-10 stale-server / rebuild audit trap.** `next start` loads `.next` ONCE at boot and `npm run build` replaces the chunks under the
   live server. After ANY wave15 client change (runner, practice page) the booted :3100 server references now-deleted chunks → client nav
   renders nothing / dead clicks while URL asserts stay green. **Kill + relaunch `npm run start -- -H 0.0.0.0 -p 3100` before running
   `audit:browser`** (wave15-15/16). New routes/pages 404 against a stale server for the same reason.
2. **Client-bundle trap for the MARATHON runner refill.** `test-runner.tsx` is `"use client"`; it must call `extendSession` via a
   `"use server"` ACTION exported from `app/actions/test.ts` — NEVER import `lib/server/*` (server-only → pulls `node:module`/bcrypt into the
   client bundle → Turbopack build error). Follow the existing `submitAnswerAction`/`finishTestAction` pattern (thin `"use server"` wrapper
   → `startTestSchema`-style validate → `lib/server` helper).
3. **P2029 for MARATHON exclusion.** Excluding already-in-session question ids MUST be a JS set-diff over the candidate pool
   (`loadReviewCandidates` already returns all category questions; filter out a `Set` of session question ids), NEVER a
   `where:{ id:{ notIn:[…1k ids] } }` — the libsql adapter throws P2029 past ~1k bound params (house rule). Chunk any `in` to ≤200.
4. **Exhaustive `Record<TestMode>` / switch sites that break when `TEST_MODES` grows (wave15-02 consumes this list):**
   - **`lib/constants.ts:34` `export const MODE_LABEL: Record<TestMode, string>`** — WILL fail typecheck (missing keys) until all four new
     labels are added. THIS is the primary exhaustiveness site to chase in wave15-02.
   - **`lib/server/study.ts:263` `createReviewSession(..., mode: "ADAPTIVE_REVIEW" | "SPACED_REVIEW", ...)`** — the literal-union param must be
     WIDENED to accept the new queue-driven modes, else passing e.g. `"QUICK"` is a type error at the call site.
   - `lib/test-engine/selection.ts:130` `switch (opts.mode)` — has a `default` case (`:144`), so it does NOT break the build; new modes fall
     through to pass-through/shuffle. New modes won't route through `selectQuestions` anyway (they branch at startSession per (a)).
   - NOT affected: `RECOMMEND_COPY` (dashboard `:59`, keyed by `recommendAction` kind), `EMPTY_NOTICE` (dashboard `:80`, `Record<string,…>`) —
     neither is `Record<TestMode>`. No other `Record<TestMode>` / exhaustive `never` site exists (grep confirmed).
5. **Difficulty is uniform (all `difficulty=1`, finding j).** DIAGNOSTIC's easy→medium ordering has NO runtime effect on the current seed —
   implement it correctly (the unit oracle binds on injected difficulties) but don't rely on it producing an observable easy-first spread live.
6. **⚠ Blueprint `section+99` offset mismatch (affects DIAGNOSTIC blueprint reuse + explains i).** `lib/exam-blueprint.ts` derives an official
   section as `displayOrder − 99` (`:122`) and its pin test asserts §33→132/§37→136/§31→130. But the ACTUAL seeded topics sit at
   **section+101**: ДОРОЖНІ ЗНАКИ(§33)→**134**, НАДАННЯ ДОМЕДИЧНОЇ ДОПОМОГИ(§37)→**138**, ТЕХНІЧНИЙ СТАН(§31)→**132** (verified in dev.db).
   Consequence: `groupCandidatesByBlock` mis-buckets real questions (their computed section is off by 2, lands in no non-remainder block →
   almost everything falls to the `pdr` remainder). This is WHY the CLAUDE.md note says the exam-blueprint integration test SKIPS. For
   wave15: (a) DIAGNOSTIC's "spread across blueprint blocks" (wave15-05/06) will over-weight the remainder block on the live seed — the pure
   oracle still binds, but the runtime spread is skewed; note it. (b) SIGN_TRAINER MUST use the OBSERVED sign displayOrders 134/135 (+ maybe
   131), NOT the spec's/blueprint's 132/133. Fixing the exam blueprint offset itself is OUT OF SCOPE (Wave 15 non-goal: no blueprint changes)
   — flag for a future wave.

### No production changes (verify item 3)
- `git status --porcelain` shows only pre-existing dirt (`scripts/restyle/state.json` + the `_composite_t.mjs`/`_sheet.mjs`/`_zoom.mjs`
  spikes) and this `tasks/` journal. No `lib/`/`app/`/`components/` files touched.

## Artifacts
- tasks/wave15-01-investigate-surfaces/journal.md — the `## Findings` + `## Risks` above ARE the deliverable.

## Log
- 2026-07-03T12:00Z mac-mini: task created by planner.
- 2026-07-03T14:30Z ClPcs-Mac-mini: investigation complete. Read startSession/study.ts/queue.ts/test-runner/result/onboarding/
  dashboard/practice/test-[id]/actions-test/validation/constants/exam-blueprint; ran read-only dev.db queries. Recorded `## Findings`
  (a)–(l) with file:line pointers + `## Risks` (1–6). KEY DISCOVERIES: (i/Risk6) the spec's sign displayOrders 132/133 are WRONG — real
  sign topics are 134 ДОРОЖНІ ЗНАКИ (357 pub) / 135 ДОРОЖНЯ РОЗМІТКА (35 pub); cat-B imageKey pool = 986. (j) ALL 2322 questions have
  difficulty=1 → DIAGNOSTIC easy→medium vacuous at runtime. (f) READINESS_MIN_SEEN=20 > 15 → diagnostic finish must show insufficient-data
  dial. Exhaustive sites: MODE_LABEL (constants.ts:34) + createReviewSession literal-union (study.ts:263). No production files changed.
- 2026-07-03T14:45Z ClPcs-Mac-mini: FIXED verify FAIL. Prior tick had left a stray `M CLAUDE.md` (a step-5
  learning append) which tripped this task's no-production-changes gate. Working tree is now clean; re-ran
  `bash tasks/wave15-01-investigate-surfaces/verify.sh` → `OK wave15-01` (exit 0). Set Status: done. Did NOT
  add a CLAUDE.md learning this tick — this task's gate forbids any non-`tasks/` diff, so a learning append
  would re-trip the exact failure.


## Verify
**Last verify:** PASS (2026-07-03T06:25:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-03T06:26:58Z)
