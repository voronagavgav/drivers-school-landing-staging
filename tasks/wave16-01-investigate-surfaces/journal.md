# Task: wave16-01-investigate-surfaces

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-04T13:36Z
**Last compute:** mac-mini

## Goal
INVESTIGATION ONLY — no production code changes. Map every surface Wave 16
(specs/wave16-monetization-scaffold.md) touches and record findings in THIS journal under
`## Findings`. PASS = ALL true:

1. `## Findings` exists and answers each of the following, with file:line pointers:
   a. GATED-SURFACE MAP (binding for wave16-08): exact render sites + data loaders for the four
      gated intelligence surfaces — (i) dashboard ReadinessDial incl. which rendered props are the
      "top-line number" (stays free) vs "detail" (bottleneck topic, seen counts, band — gated):
      `app/(app)/dashboard/page.tsx` ~:210-219 + `components/readiness-dial.tsx` prop list;
      (ii) FSRS plan surfaces: dashboard «Сьогоднішній план» ~:225-236 via `getStudyPlan`
      (`lib/server/study.ts:20`) AND the onboarding `?step=done` plan screen
      (`app/(app)/onboarding/page.tsx:79-94`) — record the DECISION (see Constraints) that the
      onboarding done-screen stays FREE, with the exact lines a later reader needs;
      (iii) calibration surface: `/progress` CalibrationSection (`app/(app)/progress/page.tsx:81,125`,
      `getCalibrationForUser`) + where `calibrationSlope` actually enters readiness
      (`lib/readiness-model.ts:27-28,160-167`) — confirm nudge scheduling does NOT read
      calibrationSlope directly today (grep lib/server/nudges.ts);
      (iv) mistake analytics: `app/(app)/mistakes/page.tsx` + `listMistakes`
      (`lib/server/mistakes.ts`) — and WHERE the MISTAKE_PRACTICE start CTA lives (this page or
      /practice?), because the practice entry must stay reachable when the analytics list is gated.
   b. DIAGNOSTIC result-page ReadinessDial (`app/(app)/test/[id]/result/page.tsx:100`): does it show
      detail beyond the top-line number? Record whether wave16-08 must touch it.
   c. NUDGE SYSTEM extension points for RETAKE_WINBACK: `NUDGE_KINDS` (`lib/constants.ts:241-246`),
      `decideNudge` priority chain (`lib/nudge-policy.ts:94-102`), the cap inputs
      (`sentLast7Days` computed at `lib/server/nudges.ts:115-121`, `emittedToday`), the dedupeKey
      shape (`<kind>:<dayKey>:<userId>`, `lib/server/nudges.ts:32`), the NotificationLog model
      (`prisma/schema.prisma:439-453`), and EVERY exhaustive `Record<NudgeKind,…>` / per-kind site
      that breaks when NUDGE_KINDS grows (known: `NUDGE_COPY` in `components/nudge-card.tsx:9`;
      grep for others — wave16-02 consumes this list). Also: which day-key/timezone helper the nudge
      path uses (needed by wave16-11's Kyiv-day window math).
   d. ONBOARDING flow for JTBD (wave16-12): step routing lines in `app/(app)/onboarding/page.tsx`
      (steps keyed on `?step=`), the existing exam-date step (step 2) — confirm «Коли твій іспит?»
      ALREADY exists there and what wave16-12 adds is (1) an explicit «ще не записався» affordance,
      (2) a NEW prep-mode step, (3) analytics emission; the local `"use server"` wrapper pattern
      (~:23-30) and the profile write fns (`lib/server/study-profile.ts:43,56,76`). List the existing
      onboarding tests that must stay green (grep tests for onboarding).
   e. ACCOUNT page exam-date section (`app/(app)/account/page.tsx:67-73`) — the exact insertion
      point + form/action pattern (useActionState wrappers) wave16-10 copies for the exam-outcome
      form; the `components/account-forms.tsx` split (client vs server file).
   f. ANALYTICS lanes: typed lane `recordEvent` (`lib/analytics.ts:9`) + `ANALYTICS_EVENTS`
      (`lib/constants.ts:179-202`); freeform lane `lib/client/track.ts` (client helper API — exact
      exported fn signature) → `trackEventSchema` (`lib/analytics-ingest.ts:71-87`, eventType is a
      bounded FREE string; unknown keys stripped). Confirm: `pricing_interest` needs NO schema
      change (freeform eventType) and JTBD events need only ANALYTICS_EVENTS additions. Point at the
      existing route integration test (`lib/server/analytics-ingest.integration.test.ts`) as the
      pattern for wave16-07's event-landing test.
   g. PUBLIC-PAGE surface (wave16-13): confirm NO middleware.ts exists and auth lives in
      `app/(app)/layout.tsx:21` `requireUser()` — so a route at `app/q/[key]/page.tsx` (outside the
      group) is public by construction. `/api/q-image/[key]` route: which key it takes (imageKey or
      questionKey — read `app/api/q-image/[key]/route.ts` + `lib/image-resolve.ts` and give a
      working example URL for a real seeded question). Question fields for public render:
      `questionKey @unique` (schema:100), `isPublished`/`isActive`/`archivedAt`, `imageKey`,
      relation `explanation QuestionExplanation?` (fields shortText/detailedText/legalReference).
      Record 3 live questionKeys from dev.db incl. one WITH an image, plus (if any exists) one
      unpublished/inactive/archived key for the 404 test.
   h. SEO state: confirm NO `app/sitemap.ts` / `app/robots.ts` / JSON-LD (`application/ld+json`) /
      `APP_ORIGIN` exist anywhere yet (grep); note `app/manifest.ts` as the closest metadata-route
      precedent for wave16-14.
   i. ADMIN action pattern for wave16-06: `createQuestion` (`app/admin/actions.ts:90`) shape
      (requireContentManager → FormData → zod safeParse → firstIssueMessage) and where an
      entitlement grant/revoke admin UI would minimally mount (existing admin page structure —
      smallest possible surface).
   j. ENV-FLAG pattern: how `COOKIE_SECURE` is read (`lib/auth.ts`) — call-time vs module-scope —
      and record the decision that `isEntitlementsEnabled()` must be a CALL-TIME env read so
      integration tests can flip it with `vi.stubEnv` (wave16-05).
   k. Seed reset block (`prisma/seed.ts`): confirm whether a new `Entitlement` table (User FK,
      onDelete Cascade) needs an explicit `deleteMany()` there (per the Restrict-vs-Cascade seed
      rule) — record yes/no with the relevant seed lines.
2. `## Risks` lists at least: the wave12b-10 stale-server/rebuild audit trap (new /pricing and /q
   routes 404 on the long-lived LAN server until restart); the client-bundle trap (pricing CTA and
   reveal components are client components — must never import lib/server/* or @/lib/rbac); the
   `Record<NudgeKind>` exhaustiveness fallout list from 1c; JSON-LD acceptedAnswer = answer leak in
   initial HTML (wave16-14 must emit acceptedAnswer only in the revealed render); `npm test` red
   window between wave16-04 (oracle red vs stub) and wave16-05 (engine green) — tasks in between
   must not gate on `npm test`; sitemap size with ~2322 published questions (fine, but note).
3. NO production changes: `git status --porcelain` shows nothing new outside `tasks/` (pre-existing
   dirt allowed: scripts/restyle/state.json, _composite_t.mjs, _sheet.mjs, _zoom.mjs).

## Constraints / decisions
- INVESTIGATION ONLY. Findings go in this journal; downstream tasks consume them as ground truth.
- BINDING PLANNER DECISIONS to confirm/refine (change only with recorded justification):
  (1) Gated set for wave16-08 is presentational + loader-enforced: dashboard readiness DETAIL
      (top-line number stays free), dashboard plan card, /progress CalibrationSection, /mistakes
      analytics list. Stored computations (readiness snapshots, mastery, calibration nightly) are
      NEVER varied by entitlement — gating is at render/loader layer only, so flag-off is inert.
  (2) Onboarding `?step=done` first-plan screen stays FREE (first-run experience; a brand-new user
      cannot have heard of pricing yet).
  (3) «Reminders» (nudges) themselves are never gated; "calibrated reminder scheduling" maps to the
      calibration surface until a true scheduled-reminder feature exists.
- Spec: specs/wave16-monetization-scaffold.md; strategy docs referenced there are context only.

## Next
- [x] Read the spec, then walk items 1a-1k gathering file:line evidence (grep/sqlite3 as needed);
      write `## Findings` + `## Risks` into this journal.
- (none — Goal met; findings + risks recorded below)

## Findings

### 1a. Gated-surface map (binding for wave16-08)

**(i) Dashboard ReadinessDial** — render site `app/(app)/dashboard/page.tsx:212-219`
(comment :210; snapshot loaded ~:100-106 via `getLatestReadiness` from
`lib/server/mastery-readiness`, imported :6). Props passed (component contract at
`components/readiness-dial.tsx:16-27`, `ReadinessDialProps`):
- `dialPercent` — the TOP-LINE number (stays FREE).
- `sufficientData` — state switch (needed by both renders; effectively free).
- DETAIL (gated): `bottleneckTitle` + `bottleneckTopicId` (the verdict-free bottleneck line +
  its topic link) and `seenCount`/`minSeen` (the progress-toward-threshold counts shown in the
  insufficient-data state).
The dial is a leaf client component ("use client", :1) receiving PLAIN props only — gating is
done by the SERVER page choosing which props to pass (e.g. null bottleneck fields for
non-entitled), never inside the client component via server imports.

**(ii) FSRS plan surfaces** —
- Dashboard «Сьогоднішній план» card: `app/(app)/dashboard/page.tsx:225-250` (h2 :229, quota
  «≈{plan.dailyQuota} · {planMinutes} хв» :230-232, `plan.message` :233, StartButton
  ADAPTIVE_REVIEW «Почати план» :236, StudyDay progress bar :239-248). Loader: `const plan =
  await getStudyPlan(user.id)` at page :106. `getStudyPlan` is defined at
  `lib/server/study.ts:690` (NOT :20 — line 20 is the `computeStudyPlan` import; the pure core
  is `lib/study-plan.ts` `computeStudyPlan`).
- Onboarding `?step=done` first-plan screen: `app/(app)/onboarding/page.tsx:78-101`
  (`step === "done"` branch :78, `getStudyPlan(user.id)` :79). **DECISION (binding, per
  Constraints (2)): this surface stays FREE** — first-run experience; a brand-new user cannot
  have heard of pricing yet. wave16-08 gates ONLY the dashboard plan card, not this screen.

**(iii) Calibration surface** — `/progress`: `app/(app)/progress/page.tsx` imports
`getCalibrationForUser` :5 (`lib/server/calibration`), `CalibrationSection` component defined
:81, data loaded :125, rendered :163. Where the slope enters readiness math:
`lib/readiness-model.ts:27-28` (`perItemPassProb(r, calibrationSlope = 1)` clamps
`r * slope`) and :160/:167 (`computeReadiness` destructures `calibrationSlope = 1`, applies it
to every seen retrievability). **Confirmed: `lib/server/nudges.ts` has ZERO references to
calibration/calibrationSlope** (grep clean) — nudge scheduling does not read it today, so
"calibrated reminder scheduling" maps to the /progress CalibrationSection per Constraints (3).

**(iv) Mistake analytics** — `app/(app)/mistakes/page.tsx` (64 lines): loader
`listMistakes(user.id, true)` :11 (defined `lib/server/mistakes.ts:82`); the analytics LIST =
per-mistake cards :34-50+ (topic title, `Помилок: {m.mistakeCount}` danger badge, question
text) plus the header count line «Активних помилок: N» :13. MISTAKE_PRACTICE start CTAs:
- ON THIS PAGE: header form :26-29 (`hidden name="mode" value="MISTAKE_PRACTICE"`,
  «Опрацювати помилки») — rendered only when `mistakes.length > 0`.
- Dashboard: `app/(app)/dashboard/page.tsx:204` («Повторити зараз», due-review card) and :345
  («Опрацювати помилки»).
- `/practice` page: NO mistake CTA (grep clean).
So when wave16-08 gates the list, the practice ENTRY stays reachable via the mistakes-page
header CTA (keep it ungated) and the dashboard CTAs — no /practice change needed.

### 1b. Diagnostic result-page ReadinessDial
`app/(app)/test/[id]/result/page.tsx:100-107` — rendered only inside `{isDiagnostic && …}`
(:99), with the FULL prop set incl. `bottleneckTitle`/`bottleneckTopicId`, followed by an
«Ось з чого почати» weakest-topic card (:108+). It DOES show detail beyond the top-line
number. **DECISION: wave16-08 does NOT touch it** — it is not in the binding gated set
(Constraints (1) lists exactly four surfaces), and the same rationale as the onboarding
done-screen applies: the diagnostic result is the first-run activation moment (the diagnostic
is offered during onboarding, `app/(app)/onboarding/page.tsx:45-47`), so its detail is the
value teaser itself.

### 1c. Nudge system extension points (RETAKE_WINBACK, consumed by wave16-02/-11)
- `NUDGE_KINDS`: `lib/constants.ts:241-246` (REVIEW_DUE, EXAM_COUNTDOWN, DAY_OFF_OFFER,
  READINESS_MILESTONE); `NUDGE_WEEKLY_CAP = 4` :249, `NUDGE_WINDOW_DAYS = 7` :250.
- `decideNudge`: `lib/nudge-policy.ts:92-106`. Global suppressors first: `emittedToday` :95,
  `sentLast7Days >= NUDGE_WEEKLY_CAP` :96. Priority chain :99-102: EXAM_COUNTDOWN >
  REVIEW_DUE > READINESS_MILESTONE > DAY_OFF_OFFER (if/else-if on `qualifies*` fns). dedupeKey
  built :105 as `kind + ":" + input.dayKey + ":" + input.userId`.
- Cap inputs (server): `lib/server/nudges.ts` — `todayDedupeKeys` :31-33 (maps over
  NUDGE_KINDS, auto-grows), `dayKey` :64, `emittedToday` :77 (any row for today's keys),
  `sentLast7Days` :115-121 = `notificationLog.count` of ALL `channel:"inapp"` rows with
  `createdAt` in the rolling window — counts IMPRESSIONS regardless of status (wave14-review
  fix; a winback cap test must respect this).
- `NotificationLog` model: `prisma/schema.prisma:439-453` (kind String :443 — comment lists
  kinds and needs updating; `dedupeKey String? @unique` :448 → ≤1/day/kind).
- Exhaustive per-kind sites that BREAK when NUDGE_KINDS grows: **only
  `components/nudge-card.tsx:9`** — `NUDGE_COPY: Record<NudgeKind, string>` (typecheck error
  until the new kind's copy is added). Repo-wide grep for `Record<NudgeKind` finds nothing
  else; `lib/nudge-policy.test.ts` has no exhaustive Record either. CAUTION: `decideNudge`'s
  if/else chain does NOT typecheck-break on a new kind — a RETAKE_WINBACK branch must be added
  explicitly (wave16-11) or the kind is silently never emitted.
- Day-key/timezone helper on the nudge path: `dayKeyInTimezone(now, tz)` from
  `lib/server/study-profile.ts:28` (tz from `getOrCreateProfile`), used at
  `lib/server/nudges.ts:48-49` (daysUntilExam), :64, :85 — wave16-11's Kyiv-day-8/9 window
  math should use the same helper.

### 1d. Onboarding flow (JTBD, wave16-12)
- Step routing: `app/(app)/onboarding/page.tsx:75-76` — `?step=` parsed to `"2" | "3" |
  "done"` else `"1"`; step 1 (category) :182+, step 2 :102-129, step 3 :131+, done :78-101.
- Exam-date step ALREADY EXISTS at :102-129 — heading is **«Коли іспит?»** (:108, NOT the
  spec's literal «Коли твій іспит?» — copy-assert accordingly), `<input type="date"
  name="examDate">` :116, skip link «Пропустити» → `?step=3` :122-124. wave16-12 adds: (1) an
  explicit «ще не записався» affordance, (2) a NEW prep-mode step («Як готуєшся?»), (3)
  analytics emission.
- Local `"use server"` wrapper pattern: :23-28 `saveExamDateAction` (calls `setExamDateAction`,
  redirects by result), :30-34 `saveDailyGoalAction` — non-exported module-level fns in the
  server page (house pattern; typechecks under Turbopack).
- Profile write fns: `lib/server/study-profile.ts` — `getOrCreateProfile` :43,
  `setExamDateAction` :56, `setDailyGoalAction` :76 (both return
  `StudyProfileActionState` :20).
- Existing onboarding tests that must stay green: NO unit/integration test file covers
  onboarding (repo grep: only `lib/server/analytics-dashboard.integration.test.ts` mentions
  the string, via event names). The binding coverage is `bin/browser-audit.sh:319-343`:
  fresh-user register → lands on /onboarding → step-1 submit with pre-checked category B →
  /dashboard, SKIPPING the optional steps 2/3 — wave16-12's new step must keep the skip path
  ≤3 clicks and those asserts green.

### 1e. Account page (exam-outcome form, wave16-10)
- «Дата іспиту» card: `app/(app)/account/page.tsx:66-75` (`ExamDateForm` :70-73 with
  `action={submitExamDate}` + `initialDate`). Insertion point for the exam-outcome section: a
  sibling `<Card className="max-w-md">` right after :75 (before «Денна ціль» :76-81).
- Action pattern to copy: non-exported module-level wrappers with inline `"use server"` at
  :23-27 (`submitExamDate`), :35, :43 — each adapts a `lib/server/study-profile` action to the
  `useActionState` `(prev, formData)` signature and is passed to the client form as a prop.
- Split: `components/account-forms.tsx` is the CLIENT file (`"use client"` :1); it imports
  only client-safe modules + `import type { StudyProfileActionState }` (:10, type-only =
  erased/safe); `SettingsFormAction` prop type :17-20. The server page owns all server-graph
  imports.

### 1f. Analytics lanes
- Typed lane: `recordEvent(eventName: AnalyticsEventName, userId, payload?)` at
  `lib/analytics.ts:9-13` (fire-and-forget, swallow-on-error); `ANALYTICS_EVENTS` at
  `lib/constants.ts:179-202` (22 names), `AnalyticsEventName` :203. JTBD events = additions to
  this array ONLY (typecheck then forces nothing else; `recordEvent` accepts them).
- Freeform lane: `lib/client/track.ts` exports `track(eventType: string, props?:
  Partial<ClientTrackEvent>): void` :361 (also `trackPageView` :356, `initTracker` :351,
  `setOptOut` :74) → `/api/track` → `trackEventSchema` at `lib/analytics-ingest.ts:71-87`:
  `eventType` is a bounded FREE string (`.trim().max().min(1)`, :73), unknown keys STRIPPED
  (zod object default). **Confirmed: `pricing_interest` needs NO schema change** — the
  wave16-07 CTA just calls `track("pricing_interest")`; the "whitelist" is the field shape,
  not an eventType enum.
- Pattern for wave16-07's event-landing test: `lib/server/analytics-ingest.integration.test.ts`
  (builds a NextRequest, calls the exported POST, partial-mocks `@/lib/auth`,
  `_resetTrackRateStore()` between cases).

### 1g. Public-page surface (wave16-13)
- NO `middleware.ts` anywhere (root and app/ checked). Auth lives in
  `app/(app)/layout.tsx:21` — `requireUser()` in the group layout — so `app/q/[key]/page.tsx`
  OUTSIDE the `(app)` group is public by construction (precedent: `app/~offline/page.tsx`;
  remember the local `<SvitlykSprite />` learning for non-shell routes).
- `/api/q-image/[key]` takes the **IMAGE key** (`Question.imageKey`, stable
  basename-without-ext, schema :99), NOT the questionKey: `app/api/q-image/[key]/route.ts:38`
  → `resolveImageDiskPath(key)` walks override > restyled-live > original
  (`lib/image-resolve.ts:14-19`); optional negotiation `?w=360|540|720` + Accept avif/webp
  (:12-17, `IMAGE_VARIANT_WIDTHS` `lib/image-resolve.ts:67`). Working example for seeded
  question `q_1_1` (imageKey `1_1_0`): `/api/q-image/1_1_0` (or `/api/q-image/1_1_0?w=540`
  with `Accept: image/avif`).
- Question fields for public render (`prisma/schema.prisma`): `imageKey` :99, `questionKey
  String? @unique` :100, `isActive` :103, `isPublished` :104, `archivedAt` :109, relation
  `explanation QuestionExplanation?` :113; `QuestionExplanation` model :144 with `shortText`
  :148, `detailedText` :149, `legalReference` :150.
- Live keys from dev.db: **`q_1_1`** (imageKey `1_1_0`), **`q_1_7`** (imageKey `1_7_0`) — both
  WITH image; **`q_1_2`** — no image. Published+active+unarchived total: **2322**.
  **No unpublished/inactive/archived row with a non-null questionKey exists in dev.db** — the
  404 test must build its own fixture (`createOfficialQuestion({publish:false})` creates
  `questionKey: NULL`, so PATCH a unique questionKey onto it) and can use any unknown key for
  the unknown-404 case.

### 1h. SEO state
Confirmed absent everywhere (grep app/lib/components): `app/sitemap.ts`, `app/robots.ts`, any
`application/ld+json`, any `APP_ORIGIN` reference. Closest metadata-route precedent for
wave16-14: `app/manifest.ts`.

### 1i. Admin action pattern (wave16-06)
`createQuestion` at `app/admin/actions.ts:90`: `requireContentManager()` :91 → FormData field
extraction helpers (`str`/`optionalStr`/`intOr`/`bool`) :93-101 → `adminQuestionSchema.safeParse`
:103+ → `firstIssueMessage` on failure (FormState pattern). Admin structure: `app/admin/page.tsx`
(stats + recent-actions home) + one dir per section (`analytics/`, `categories/`, `questions/`,
`topics/`, `content-health/`, `content-versions/`, `learning-health/`, `readiness-shadow/`),
nav links in `app/admin/admin-nav.tsx`. Minimal mount for grant/revoke: a new
`app/admin/entitlements/page.tsx` section (house per-section pattern) + one nav link —
smaller than wedging a form into the stats home; actions go in `app/admin/actions.ts`
following the `createQuestion` shape + `logAdminAction`.

### 1j. Env-flag pattern
`COOKIE_SECURE` is read at `lib/auth.ts:61` as `process.env.COOKIE_SECURE === "true"` INSIDE
the cookie-setting function body — a CALL-TIME read, not module-scope. **DECISION (binding for
wave16-05): `isEntitlementsEnabled()` must equally read `process.env.ENTITLEMENTS_ENABLED` at
call time** (never hoist to a module-scope const) so integration tests can flip it with
`vi.stubEnv` per-test.

### 1k. Seed reset block
`prisma/seed.ts:24-40`. A new `Entitlement` table with User FK `onDelete: Cascade` needs **NO
explicit `deleteMany()`**: `prisma.user.deleteMany()` at :39 cascades it (rule: Cascade
children can be skipped, RESTRICT children cannot — cf. the explicit `reviewLog`/`reviewState`
lines :32-33, which are Restrict→Question). Adding one anyway is harmless but not required.

## Risks
1. **Stale-server audit trap (wave12b-10 class):** the new `/pricing` and `/q/[key]` routes
   404 on the long-lived LAN `next start` server until it is killed and relaunched after
   `npm run build` — wave16-07/-13/-15 must restart the server before any browser-audit run.
2. **Client-bundle trap:** the pricing CTA (calls `track()`) and the /q answer-reveal
   component are client components — they must NEVER import `lib/server/*`, `@/lib/db`, or
   `@/lib/rbac` (Turbopack `node:module` build error); pass plain props / use
   `lib/client/track.ts` only. Entitlement checks stay server-side (spec standing rule).
3. **`Record<NudgeKind>` exhaustiveness fallout (from 1c):** adding RETAKE_WINBACK to
   `NUDGE_KINDS` (wave16-02) breaks typecheck at `components/nudge-card.tsx:9` (`NUDGE_COPY`)
   until copy is added — wave16-02 must add the COPY-PENDING-L4 string in the same task.
   Inverse gap: `decideNudge`'s if/else chain does NOT break — without an explicit branch
   (wave16-11) the kind is silently never emitted; needs a test, not just typecheck.
4. **JSON-LD answer leak (wave16-14):** `acceptedAnswer` in the initial HTML = the correct
   answer leaked pre-interaction, violating T5's view-source test. Emit `acceptedAnswer` only
   in the revealed render (or omit entirely while gated) — the JSON-LD shape must be derived
   from the SAME no-leak rule as the visible markup.
5. **`npm test` red window:** between wave16-04 (oracle written red against the stub) and
   wave16-05 (engine goes green), the default unit suite is RED by design — tasks landing in
   between (e.g. wave16-06/-07 if reordered) must not gate on `npm test`.
6. **Sitemap size:** ~2322 published questions → one `/sitemap.xml` is fine (limit 50k URLs /
   50 MB), no index file needed; note the count is seed-dependent.
7. **q-image key mismatch:** the public /q page must pass `Question.imageKey` (e.g. `1_1_0`)
   to `/api/q-image/[key]`, NOT the route's own `questionKey` (`q_1_1`) — confusing the two
   404s every image.
8. **404-test fixture gap:** dev.db has zero retired/unpublished rows with a questionKey
   (1g) — the wave16-13 404 test must create and patch its own fixture.
9. **Nudge cap counts impressions:** `sentLast7Days` counts ALL inapp rows created in the
   window regardless of status (`lib/server/nudges.ts:115-121`) — wave16-11's
   cap-honored-under-competition test must seed rows by `createdAt`, not `status:"SENT"`.
10. **Mistakes CTA reachability:** the mistakes-page header CTA renders only when the list is
    non-empty; when wave16-08 gates the LIST it must keep the header CTA (and the count line,
    or a neutral variant) outside the gate so MISTAKE_PRACTICE stays reachable.

## Artifacts
- tasks/wave16-01-investigate-surfaces/journal.md — findings live here (## Findings + ## Risks above)

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T13:36Z ClPcs-Mac-mini: read specs/wave16-monetization-scaffold.md; walked items
  1a-1k with grep/sed/sqlite3 (no production changes); wrote ## Findings (a-k with file:line
  pointers, live questionKeys q_1_1/q_1_7/q_1_2, decisions recorded: result-page dial NOT
  gated, onboarding done-screen free, call-time env read) + ## Risks (10 items incl. all 6
  required). Corrections vs journal hints: getStudyPlan is at lib/server/study.ts:690 (not
  :20); onboarding step-2 heading is «Коли іспит?» (not «Коли твій іспит?»). Status → done.

## Verify
**Last verify:** PASS (2026-07-04T13:38:20Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T13:39:15Z)
