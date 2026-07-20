# Wave 12b — Surface map (investigation, task wave12b-01)

Line-mapped inventory of every surface the W12b tasks (02–17) touch, from a real read of the files
on 2026-07-02 (post-wave12a `main`, commit 798709a). Each section ends with a `DECISION:` line the
implementing task consumes where `specs/wave12b-learner-surfaces.md` left a choice open.

## Dashboard current

`app/(app)/dashboard/page.tsx` (310 lines):

- **`ReadinessMeter` block** — lines 164–207: a `Card` holding `<ReadinessMeter level={r.level} score={r.score} …/>` (line 168) fed by `computeProgress(...).readiness`, plus the trend `Badge` (170), the sparkline `<svg>` (171–189), the «Чому такий рівень» reasons list (192–202), and a legal-disclaimer line (204–206: «…не гарантує складання офіційного іспиту»).
- **The disagreeing `examReadiness` «N зі 100» card** — lines 209–220: a second `Card` («Орієнтовна готовність до іспиту») showing `estimate.score` (213) + «зі 100» (214) + a band `Badge` (215), computed at lines 83–87 via `examReadiness({recentExamScores, topicBands})` from `@/lib/readiness` — a DIFFERENT model than `ReadinessMeter`'s, hence the UX-FINDINGS disagreement. Its own disclaimer is lines 217–219 («…а не гарантія складання…» — kept on ONE line for the wave5-10 negation gate).
- **Recommend block** — lines 100–110: an if/else chain over `p.unresolvedMistakes` → `MISTAKE_PRACTICE`, `p.weakTopics.length` → `MIXED_PRACTICE`, `p.recentExam.total === 0` → `EXAM_SIMULATION` («Почати симуляцію»), else `EXAM_SIMULATION` («Ще одна симуляція»). Rendered as the «Рекомендована дія» card at lines 242–250. NOTE (spec §A): the fresh/thin-data branch today recommends the TIMED EXAM (line 107) — exactly what UX-FINDINGS flags; there is no failed-mock corrective branch, and no `lib/recommend-action.ts` exists yet.
- **«Почати симуляцію» literal occurrences** — exactly two: line 107 (recommend `cta`) and line 274 (quick-start `StartButton` label). These are the duplicate CTAs §A/§C consolidate. (Line 109 «Ще одна симуляція» is a third exam CTA in disguise.)
- **`#exam` anchor + quick-start grid** — lines 265–292: `<div id="exam" className="scroll-mt-4">` (266) wrapping «Почати тест» with 4 cards: Екзаменаційна симуляція (269–275, format line 271–273 «20 питань · 20 хв · до 2 помилок» from constants), Змішана практика (276–280), Робота над помилками (281–285), Практика за темами → `/practice` (286–290). The app-nav «Іспит» tab targets `/dashboard#exam`.
- **`EMPTY_NOTICE` map** — lines 56–62, keys: `MISTAKE_PRACTICE`, `SAVED_QUESTIONS`, `EXAM_SIMULATION`, `MIXED_PRACTICE`, `TOPIC_PRACTICE`. NO `SPACED_REVIEW` key (and no `ADAPTIVE_REVIEW`) — yet `startTestAction` maps `NothingDueError` → `redirect("/dashboard?empty=SPACED_REVIEW")` (`app/actions/test.ts:43`), so the SPACED nothing-due state renders NO banner at all today (line 124 guards on `EMPTY_NOTICE[empty]`).
- **Legal disclaimers** — lines 204–206 (readiness card) and 217–219 (estimate card). At least one must survive the dial rework (spec §A: «Legal disclaimer stays»).
- Other blocks tasks may move: resume card 130–143, due-mistakes card 145–162 (uses `countDueMistakes` — the MISTAKE bank, not ReviewState), streak/daily-goal cards 222–240 (legacy `studyStreak` from activity dates + `DAILY_GOAL_ANSWERS`, NOT the W11 `UserStudyProfile` streak fields), stats grid 252–258, weak topics 294–307.
- Dashboard does NOT import `getLatestReadiness` or `getStudyPlan` today — the dial (task 06) and plan card (task 07) are new wiring.

DECISION: task 06 removes BOTH the `ReadinessMeter` card (164–207) and the `examReadiness` card (209–220) from the learner dashboard and replaces them with ONE dial hero fed by `getLatestReadiness`; the reasons list dies with them; keep exactly one legal-disclaimer line under the dial (reuse the 217–219 wording — it already satisfies the wave5-10 same-line negation gate). Task 07 also adds the missing `EMPTY_NOTICE.SPACED_REVIEW` copy (calm «нічого не заплановано» per spec §B) so the existing redirect stops being silent.

## Readiness data

`lib/server/mastery-readiness.ts` — `getLatestReadiness(userId, categoryId)` at lines 327–353:

- Reads the latest `ReadinessSnapshot` (`findFirst`, `orderBy createdAt desc`, category-scoped when non-null). **Returns `null` when no snapshot exists** (line 332) — the fresh-user case: snapshots are only created by `recomputeReadiness` on the finish path, so a user who never finished a session has none.
- Return shape (lines 345–352): `{ snapshot, sufficientData: boolean, seenCount: number, dialPercent: number, bottleneckTopicId: string | null, mock: {m, k} }`. `sufficientData`/`seenCount`/`mock` are parsed from `snapshot.inputsJson` (defaults `false`/`0`/`{m:0,k:0}` on parse failure); `dialPercent` and `bottleneckTopicId` are snapshot columns.
- The bottleneck TITLE is NOT a top-level field — it lives at **`snapshot.bottleneckTitle`** (denormalised onto the row at write time, lines 287–294/316; may be `null`).
- Threshold: `sufficientData = seenCount >= READINESS_MIN_SEEN` (line 277), with `READINESS_MIN_SEEN = 20` (`lib/constants.ts:106`). When insufficient, the stored `dialPercent` is forced to 0 (line 278).
- So the dial has THREE states: `null` (no snapshot at all — treat as insufficient with `seenCount 0`), `sufficientData:false` (progress toward 20), `sufficientData:true` (`dialPercent` + bottleneck line).

DECISION: task 06 treats `getLatestReadiness(...) === null` identically to `sufficientData:false, seenCount:0` (one «Ще недостатньо даних…N з 20» rendering path, N from `READINESS_MIN_SEEN − seenCount`); the bottleneck line reads `snapshot.bottleneckTitle` and links to TOPIC_PRACTICE via `snapshot.bottleneckTopicId`.

## Plan data

- `getStudyPlan(userId, now = new Date())` — `lib/server/study.ts:349–393`. Returns the pure `StudyPlan` from `lib/study-plan.ts:19–24`: `{ daysLeft: number | null, dailyQuota: number, feasible: boolean, message: string }` (message copy variants at study-plan.ts lines 37–80; `MAX_DAILY_QUOTA = 40`). Internally: `getOrCreateProfile` (350), category from `user.selectedCategoryId` (351–355), published-question scan (357–366), ReviewState `where:{userId}` scan → `dueCount`/`unseenCount` (369–380), day keys via `dayKeyInTimezone(now, profile.timezone)` (383–384).
- **Today's answered count**: read the `StudyDay` row for today — `prisma.studyDay.findUnique({ where: { userId_day: { userId, day: dayKeyInTimezone(now, profile.timezone) } } })`; its `reviewCount` is bumped once per FIRST-attempt answer by `bumpStudyDay` (`lib/server/study-profile.ts:96–115`), `goalMet = reviewCount >= profile.dailyGoal` (109). No server helper currently exposes this — task 07 reads it directly (or adds a tiny read helper).
- **Streak/freeze fields on `UserStudyProfile`**: `streakCurrent`, `streakBest`, `freezeTokens`, `lastStudyDay` (+ `freezeAutoUsedOn`), written by `finishSession`'s streak block (test-engine.ts:522–531). Also `dailyGoal` (default source for plan size) and `examDate`/`timezone`.
- Minutes estimate: nothing exists — «M хв» must be derived (per-question seconds constant × quota) in the component or a pure helper.
- Plan-card start = ADAPTIVE_REVIEW via the EXISTING `startTestAction` (`app/actions/test.ts:23–48`) with `mode=ADAPTIVE_REVIEW` — `startSession` dispatches it at `lib/server/test-engine.ts:63`.

DECISION: task 07 renders «≈N питань» from `plan.dailyQuota` and «M хв» as `Math.ceil(dailyQuota × 30s / 60)` (30 s/питання, a constant in the component — no schema change); daily-goal progress = today's `StudyDay.reviewCount` vs `profile.dailyGoal`; streak/freeze display reads the `UserStudyProfile` fields, NOT the legacy `studyStreak(activityDates)` (which task 06/07 retires from the dashboard along with `DAILY_GOAL_ANSWERS`).

## Finish path

`finishSession(sessionId, userId)` — `lib/server/test-engine.ts:445–534`:

- Guard: only acts on `IN_PROGRESS` (455–463); a repeat finish returns the stored summary (no re-snapshot, no re-events).
- Post-completion block: totals (465–471) → session update to `COMPLETED` (474–483) → analytics (485–490) → `snapshotProgress` (492) → touched-topic derivation (497–507) → **`recomputeTopicMastery(userId, touchedTopicIds)` (508)** → **`recomputeReadiness(userId, session.categoryId)` (509)** → streak block (515–531). None of this is retryable today: a transient failure in 492–531 after the 474 status flip is lost forever (the guard at 455 makes a re-call return early) — the exact §G motivation for `finalizeSession`.
- **`getOrCreateProfile` call sites reachable in one finish flow** (grep-verified, all sites in the repo):
  1. `submitAnswer` per-answer, FIRST attempt only — `lib/server/test-engine.ts:418` (`getOrCreateProfile(params.userId, tx)`, fetched for `profile.timezone`), immediately followed by `bumpStudyDay(...)` (419)…
  2. …and `bumpStudyDay` ITSELF calls `getOrCreateProfile(userId, tx)` again — `lib/server/study-profile.ts:103`. So EVERY first-attempt answer performs **two profile upserts in the same transaction**.
  3. `finishSession` — test-engine.ts:515 (standalone, for timezone + streak fields).
  4. (`getStudyPlan` — study.ts:350 — is on the dashboard read path, not the finish flow.)
- **Spec §G premise verdict**: the phrase "double `getOrCreateProfile` upsert on the finish path" is CONFIRMED in substance but mislocated: `finishSession` itself calls it ONCE (515); the literal double upsert is per-answer on the SUBMIT path (test-engine.ts:418 + study-profile.ts:103). A finished session of N answered questions performs 2N+1 profile upserts end-to-end.
- **StudyDay on the finish path**: NOT written by `finishSession`. StudyDay rows are written only per-answer via `bumpStudyDay` inside `submitAnswer`'s transaction (test-engine.ts:414–419). 
- **`nextStreakState` inputs** (517–521): `{current: profile.streakCurrent, best: profile.streakBest, lastDay: profile.lastStudyDay}` + `todayKey = dayKeyInTimezone(new Date(), profile.timezone)` (516) + `profile.freezeTokens`. It does **not** read StudyDay rows — so a `goalMet` StudyDay and the streak walk can disagree (the §G reconcile: streak advances on ANY finished session regardless of goal, from profile fields only).

DECISION: task 04 extracts lines 485–531 (analytics stays inline; snapshot/recompute/streak move) into an idempotent `finalizeSession(sessionId)` keyed off the COMPLETED session and re-callable; de-dupes the submit-path double upsert by making `bumpStudyDay` the single owner (it already fetches the profile at study-profile.ts:103 — drop the `tz` param, return/derive the timezone internally, delete the outer call at test-engine.ts:418); streak reconcile reads StudyDay rows as the one source of truth per spec §G.

## Runner regions

`components/test-runner.tsx` (516 lines, `"use client"`; `idx` is plain `useState(0)` at line 61):

- **Header row** — lines 234–243: `flex items-center justify-between` with «{idx+1} / {questions.length}» (236–238), topic title `hidden sm:inline` (239), `DemoBadge` (240), and `{isExam && deadlineMs && <Timer …/>}` (242). NOT sticky — scrolls away (the UX-FINDINGS timer complaint).
- **Progress bar** — lines 245–248: `.road`/`.road-fill` div, width `((idx+1)/questions.length)*100%`.
- **Options + roving** — radiogroup lines 284–329 (`role="radiogroup"` + `onKeyDown={onOptionsKeyDown}` at 288); `moveChoice` 172–180; `onOptionsKeyDown` 182–191 (ArrowDown/Right/Up/Left only — **no digit-key handling anywhere**); roving tabindex math at 94–95; option buttons `role="radio"` 298–327.
- **`submit()`** — lines 136–162 (snapshot for retry 137, `startTransition` → `submitAnswerAction` 144–161, practice feedback set 147–155); `choose()` 102–131 (attempt/clientEventId semantics 106–118, latency 119–121); `retrySubmit` 164–168.
- **Bottom nav «Назад/Далі/Завершити»** — lines 389–416: mid-content flex row (Назад 391–393, Далі 395–405, Завершити тест 406–414 opening the `confirming` modal 461–483). NOT sticky/thumb-zone.
- **Navigator grid** — lines 418–453: `<nav aria-label="Навігатор питань">`, `grid-cols-8 sm:grid-cols-10`, per-question ✓/⚑ markers.
- **Timer** — component lines 488–516: 1 s `setInterval` against `deadlineMs`, `role="timer" aria-live="polite"`, low-time state <60 s. Rendered only in the header (242).
- **Confirmed absences** (grep over `components/ app/ lib/`): NO `sessionStorage`/URL-hash question-index persistence (the only `sessionStorage` use in the repo is the analytics sessionId in `lib/client/track.ts`) — reload restarts at question 1; NO `scrollIntoView` anywhere — practice feedback (351–359) can render below the fold untouched; NO touch/swipe handlers; `setAnswerConfidence` does not exist anywhere in the repo (grep-verified) and `submitAnswerAction` already passes an optional `confidence` through to `submitAnswer` → `TestAnswer.confidence` + `recordReview`.

DECISION: task 10/11 persist the current index in **sessionStorage** (key `ds_runner_idx:<sessionId>`; URL hash rejected — it fights Next router navigation and survives sharing/bookmarks where it's meaningless), restored on mount with clamp to `questions.length−1`; digit keys 1–4 map to `q.options[digit−1]` via the same `choose()` path; explanation auto-scroll targets the feedback div (351) with `scrollIntoView({behavior: reduced-motion ? "instant"/"auto" : "smooth", block:"nearest"})`.

## Result data

`app/(app)/test/[id]/result/page.tsx` (131 lines) loads `prisma.testSession.findFirst` + **`getSessionState(id, user.id)`** in parallel (14–17), redirects non-COMPLETED to the runner (19).

- `getSessionState` (`lib/server/test-engine.ts:239–305`) returns per-question (281–303): `questionId`, `displayOrder`, `text`, image fields, **`topicTitle`** (289, from the included `topic` relation), `isDemo`, options with `isCorrect` revealed only when COMPLETED (295), `explanation` (297), `answered: Boolean(ans)` (298), `selectedOptionId: ans?.selectedOptionId ?? null` (299), `isCorrect: ans?.isCorrect ?? null` (300), `saved`.
- **`topicId` is NOT in the payload today**: the query includes the full `topic` relation (248) so `sq.question.topicId` is loaded, but the mapping only emits `topicTitle`. Task 09's grouping-with-links needs `topicId` added to the mapped object (one-line additive change) — correctness IS available (`isCorrect` per question).
- **Unanswered representation**: no `TestAnswer` row → `answered:false`, `selectedOptionId:null`, `isCorrect:null`. The result page labels via `q.isCorrect ? "Правильно" : "Помилка"` (92) — `null` is falsy, so an unanswered question is mislabelled **«Помилка»** today (spec §C requires «без відповіді»), and no option gets the «ваша відповідь» marker (99 never matches). Scoring-wise `finishSession` counts it wrong implicitly (`wrong = total − correct`, 467).
- Outcome headline today: mode-agnostic Svitlyk copy keyed only on `session.wrongAnswers > 0` (58–67); exam pass/fail badge 41–45; «Пройти ще раз» re-start form 72–75.

DECISION: task 09 adds `topicId: sq.question.topicId ?? null` to `getSessionState`'s question mapping (additive, no callers break), computes «Найбільше помилок у темах» from questions with `answered && isCorrect === false` (unanswered EXCLUDED from the wrong-topic grouping), grouped by `topicId`, top 3 by count, each linking via the existing TOPIC_PRACTICE form action; unanswered (`isCorrect === null`) gets a neutral «Без відповіді» badge instead of «Помилка».

## Due counts

- **Inline due-count sites today** (ReviewState-based):
  - `getStudyPlan` — `lib/server/study.ts:369–379`: ReviewState `where:{userId}` scan, JS-joined against the category's published-question id set, `dueCount++` when `s.dueAt != null && s.dueAt.getTime() <= now.getTime()` (378).
  - `startSpacedReview` — `lib/server/study.ts:322–324`: same predicate as a filter over `loadReviewCandidates` output (`c.state?.dueAt != null && c.state.dueAt.getTime() <= now.getTime()`).
- **NO exported count helper exists** — grep for `countDue` finds only `countDueMistakes` (`lib/server/mistakes.ts:70`), which counts the `UserMistake` bank (a different subsystem; it feeds the dashboard's due-mistakes card at dashboard lines 96–98), not ReviewState. Task 08's SPACED badge must not reuse it.
- Both existing sites obey the P2029 rule (userId scan + JS join, never an id-list `in`).

DECISION: task 08 adds `countDueReviews(userId, categoryId, now = new Date())` to `lib/server/study.ts`, implemented as `getStudyPlan`'s scan (369–379) factored out (published-question id set + ReviewState scan + the `dueAt <= now` predicate) and reused by `getStudyPlan` so the two counts can never diverge.

## Audit + shots

- `bin/browser-audit.sh` (170 lines): `set -u`, ORIGIN arg default `http://100.110.64.90:3100` (non-localhost REQUIRED — Secure-cookie class), helpers `say/ok/bad` (36–38), `url()/body()` (40–41), `nav()` (44), `assert_url` (46–52), `assert_text` (53–55), `login()/logout()` (57–69), curl reachability gate (77–81). Assertion lanes: login-persist + disclaimer (83–86), W12a capsule + aria-current (88–105), start-exam (107–111), real answer→feedback in a PRACTICE run (113–128), 5 authed pages (130–134), auth guard (136–139), not-found (141–144), RBAC (146–148), admin + readiness-shadow (150–164) — **19 ok/bad assertion sites**. It uses ONLY the seeded creds (`DS_USER`/`DS_ADMIN` env, defaults `user@drivers.school`/`admin@drivers.school`, lines 25–28): **NO fresh-user registration lane exists**, and it **never finishes a session** (answers one practice question at 122, then navigates away) — so no result-screen assertion is possible today.
- `bin/design-shots.sh` (99 lines): same helper style; two viewports 390×844 / 1440×900 (30–31); content-aware precheck (86–91, marker «Вхід» — the 12a fix). The **runner-finish flow task 17 ports is lines 70–76**: click a radio → `sleep 1` → click «Завершити» twice (the confirm step, 73–74) → `wait networkidle` → assert url contains `/result` (76). Best-effort (`skip` not fail).
- Fresh-user needs (spec §H): dial insufficient-data state, plan-card start → `/test/` with ADAPTIVE_REVIEW, SPACED nothing-due calm state — all three require a user with NO sessions/ReviewState, which the seeded `user@drivers.school` cannot guarantee (prior audit runs answer questions as it).

DECISION: task 17 adds a fresh-user lane that REGISTERS via `/register` with a per-run unique email (`audit+<ts>@drivers.school`, `ts` already exists at line 30), asserts the three fresh states there (registration itself becomes assertion #1 of the lane), then finishes an exam as the SEEDED user (porting design-shots lines 70–76 with `assert_url "/result"` hardened to ok/bad) for the result-topic-summary assertion — keeping the existing 19 assertions untouched.

## Settings + forms

- `lib/server/user-settings.ts` (29 lines): exports ONLY the read-only `getGlassTierOverride(): Promise<GlassTierOverride>` (21–29) — `getSessionUserId()` → `UserSettings.glassTier` via `findUnique`, default `"auto"`, **never writes** (no row is created). Task 14's `setGlassTierAction` is a NEW export (the `UserSettings` model + `glassTier` column already exist; write = upsert, self-only via `requireUser`, validated to the `GlassSignals["override"]` union auto/real/emulated/solid).
- `lib/server/study-profile.ts`: `setExamDateAction` (55–69) and `setDailyGoalAction` (75–87) — both self-only (`requireUser`), zod-validated (`setExamDateSchema` at `lib/validation.ts:102`, `setDailyGoalSchema` at :114, goal 5..100), returning `StudyProfileActionState = {ok:true} | {error}` (19). **Unwired to any UI** — grep shows no page/component imports them; `/account` (`app/(app)/account/page.tsx`, 37 lines) renders only name/email (17–19), `ChangePasswordForm` (21–26) and `AnalyticsOptOutToggle` (28–33) from `components/account-forms.tsx`. Onboarding (task 13) and account (task 14) both wire these actions.
- **Native-validation attributes today** (`components/auth-forms.tsx`, `components/account-forms.tsx`): login — email `type="email" required` (auth-forms:22), password `type="password" required` (:23); register — name `required` (:42), email `type="email" required` (:43), password `type="password" required` + placeholder «Щонайменше 8 символів» but **no `minLength`** (:44 — the 8-char floor is server-side zod only); change-password — two `type="password" required` fields (account-forms:39–40, 46–47). No `pattern`, no `noValidate`, no `setCustomValidity`/`onInvalid` handling anywhere — so all violation tooltips are the browser's ENGLISH defaults (the UX-FINDINGS item).
- Server actions already return Ukrainian error strings via `firstIssueMessage`, so only the CLIENT-side pre-submit layer is missing.

DECISION: task 15 uses lightweight JS validity handling, not zod-on-client: one pure mapper `validityMessage(validity: ValidityState, kind: "email"|"password"|"name"|…) → string | null` (unit-testable — construct plain objects shaped like ValidityState) + a tiny `onInvalid`/`onInput` wiring in the shared `Field` component calling `setCustomValidity`; also add the missing `minLength={8}` to the register password so `tooShort` fires client-side (matching the existing zod floor).

---
Investigation complete 2026-07-02 · every line number from a direct read of the current files · no source edits.
