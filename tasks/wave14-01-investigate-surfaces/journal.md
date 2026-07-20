# Task: wave14-01-investigate-surfaces

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02T21:05Z
**Last compute:** mac-mini

## Goal
INVESTIGATION ONLY — no production code changes. Map every surface Wave 14
(specs/wave14-engagement-calm.md) touches and record findings in THIS journal under `## Findings`.
PASS = ALL true:

1. `## Findings` exists and answers each of the following, with file:line pointers:
   a. Dashboard render path: where in `app/(app)/dashboard/page.tsx` a nudge card would mount; which
      server helpers the page already calls (getStudyPlan? countDueReviews? recommend-action?); how
      `profile.examDate`, streak, and StudyDay `goalMet` are read today.
   b. Readiness milestones: how to read the two most recent `ReadinessSnapshot` rows for a user (for
      the 25/50/75 dial crossing) and what "sufficientData" maps to in the existing model
      (`lib/readiness-model.ts` / `lib/server/mastery-readiness.ts` — name the exact field/derivation).
   c. UserSettings read path: which module loads `notifReviewDue`/`notifExamCountdown`/`notifStudyReminder`
      today and whether a get-or-create helper exists.
   d. Exam CTA forms: EVERY `<form action={startTestAction}>` that submits `mode=EXAM_SIMULATION`
      (dashboard, practice, anywhere else) — exact files/lines; note how `SubmitButton` works, since the
      §C calm ritual must intercept these without breaking the server action.
   e. `/progress` page structure: section order + the component idiom (`Card`/`SectionTitle`) the
      calibration section should follow; where the wave12b «Карта тем» section sits.
   f. Account surface: `app/(app)/account/page.tsx` structure + the wave12b-14 inline-`"use server"`
      wrapper pattern (quote it), and where a link to `/account/data` belongs.
   g. Data-rights enumeration: for EACH of User, UserStudyProfile, StudyDay, ReviewState, ReviewLog,
      TopicMastery, ReadinessSnapshot, TestSession, TestAnswer, TestSessionQuestion, UserMistake,
      SavedQuestion, UserSettings, NotificationLog — the prisma delegate name, the user-scoping where
      clause (note: TestAnswer/TestSessionQuestion scope via their TestSession), and the onDelete
      behavior of the FK chain back to User (from prisma/schema.prisma; confirm deletion of a User
      cascades to ALL of them, and list which "safe" User scalars export may include — NEVER
      passwordHash / tokenVersion).
   h. Admin: `app/admin/layout.tsx` NAV array (exact insertion point after «Готовність (тінь)»),
      `QuestionExplanation.reviewedStatus` semantics (UNREVIEWED | REVIEWED | NEEDS_FIX),
      `Question.difficulty` (1..5), the existing admin question-filter URL usable as the "unreviewed
      queue" link, and what `lib/content-flags.ts` exports that learning-health (§E) can reuse.
   i. Nightly job: `scripts/nightly-readiness.ts` structure (flags, CHUNK pattern, where a new step is
      appended, how it is launched — ops/README/launchd) for §B slope refresh + §F pruning.
   j. Browser audit: `bin/browser-audit.sh` — how assert_url/assert_text work, where the seeded-user vs
      fresh-user sections split, and the cleanest place for the §G assertions.
   k. Confidence uptake: where `CONFIDENCE_SAMPLE_RATE` sampling happens (lib/confidence-sampling.ts and
      its call sites) and how "sampled answers" (ReviewLog rows with non-null confidence) can be counted
      for the §E uptake %.
2. A `## Risks` list containing at least: the client-bundle trap for §C wiring (client component must not
   import server-graph modules), the wave12b-10 stale-server/audit-rebuild trap, and any table in (g)
   whose chain to User is NOT Cascade (would break §D delete) — or an explicit "all Cascade confirmed".
3. NO changes outside `tasks/`: `git status --porcelain` shows only `tasks/` paths from this task.

## Constraints / decisions
- Investigation is separate from implementation (planner method) — do NOT fix or implement anything found.
- Later wave14 tasks consume these findings in fresh contexts — be precise with file:line pointers.

## Next
- [ ] DONE — Findings + Risks recorded below. (If a downstream task disputes a pointer, re-verify that one item.)

## Artifacts
- tasks/wave14-01-investigate-surfaces/journal.md — the findings themselves

## Findings

### 1a. Dashboard render path — `app/(app)/dashboard/page.tsx`
- **Nudge-card mount point:** page body is one `<div className="space-y-6">` opening **line 137**, closing **line 320**; cards stack top-down. Existing conditional nudge cards to model on: Resume-session card **154–167**, Due-for-review card **169–186** (`{dueReviewCount > 0 && (<Card className="border-lane/40 bg-lane/10">`). Best mount for the day's nudge: **between 167 and 169** (after Resume, before Due) or **right after 186** (before the ReadinessDial hero at 188–201).
- **Server helpers already called:** `computeProgress` (import L4, call L94) · `getLatestReadiness` (L5 / L97) · `getResumableSession` (L6 / L113) · `getStudyPlan` (L7 / L102) · `dayKeyInTimezone` + `getOrCreateProfile` (L8 / L103–104) · `recommendAction` (L10 / L129–133) · `countDueMistakes` (L21 / L116). **NOTE the real names:** there is NO `countDueReviews` — the due counter is **`countDueMistakes`** (→ `dueReviewCount`); the recommend helper is **`recommendAction`** (not `recommend-action`).
- **examDate / streak / goalMet reads:** `profile.examDate` is **NOT read on this page today** (only `profile.timezone`, `.dailyGoal`, `.streakCurrent`, `.freezeTokens` are consumed) — a countdown nudge must add the read. Streak = `profile.streakCurrent` (rendered L227), sourced from `getOrCreateProfile` (L103). `StudyDay.goalMet` read via a **direct prisma query** (no helper): `prisma.studyDay.findUnique({ where: { userId_day: { userId, day: todayKey } }, select: { reviewCount, goalMet } })` at **L105–108**; `goalReached = today?.goalMet ?? false` (L110), rendered L220.

### 1b. Readiness milestones — `lib/server/mastery-readiness.ts`
- **Latest snapshot read** (single row today): `getLatestReadiness` (starts L326) does `prisma.readinessSnapshot.findFirst({ where:{ userId, ...(categoryId?{categoryId}:{}) }, orderBy:{ createdAt:"desc" } })` at **L327–330**. For the 25/50/75 crossing, generalize to `findMany({ …, orderBy:{ createdAt:"desc" }, take:2 })` — `createdAt` is the ONLY temporal key on `ReadinessSnapshot` (no `finishedAt`). Snapshot rows are written via `create` at **L306–318** (fields incl. `dialPercent`, `passProbability`, `calibrationSlope`, `inputsJson`).
- **sufficientData** is NOT a stored column — it's a derived boolean: `const sufficientData = seenCount >= READINESS_MIN_SEEN;` at **L276** (`seenCount = seenR.length`, count of pool questions having a ReviewState, L201; `READINESS_MIN_SEEN` from `@/lib/constants`, imported L11). When false → forces `dialPercent = 0` (L277). It is persisted ONLY inside the serialized `inputsJson` blob (L297–304) and read back by JSON-parsing `inputsJson` in `getLatestReadiness` (parse L339, defaults false L346). The pure `lib/readiness-model.ts` has no `sufficientData` concept — it lives entirely in the server layer.
- **`recomputeReadiness` signature** (L160–165): `recomputeReadiness(userId, categoryId, tx = prisma, now = new Date())` — it does **NOT** take a `calibrationSlope` param. Slope is fetched INTERNALLY: `profile = tx.userStudyProfile.findUnique({ where:{userId}, select:{calibrationSlope:true} }); const calibrationSlope = profile?.calibrationSlope ?? 1` (**L189–193**), then passed to `perItemPassProb`/`computeReadiness`. So §B wiring = "nightly refreshes `UserStudyProfile.calibrationSlope`" and `recomputeReadiness` already picks it up on the next run — no signature change needed. (Pure `computeReadiness` DOES accept `calibrationSlope` via `ReadinessInput` — `lib/readiness-model.ts:107-108,160`; `perItemPassProb(r, calibrationSlope=1)` L27.)

### 1c. UserSettings read path
- Fields live on **`UserSettings`** in `prisma/schema.prisma`: `notifStudyReminder` **L413**, `notifReviewDue` **L414**, `notifExamCountdown` **L415** (all `Boolean @default(true)`; quiet hours `notifQuietStart/End` L416–417).
- **No module reads these three fields today** — repo-wide grep hits ONLY the schema. No settings UI/loader consumes them yet.
- Only UserSettings loader in app code: **`lib/server/user-settings.ts`** — `getGlassTierOverride()` (L25–33) does `findUnique({ where:{userId}, select:{ glassTier:true } })` (selects glassTier only, defaults `"auto"`), `setGlassTierAction()` upserts (L50–62). **There is NO `getOrCreateSettings` helper** — a notif reader must add one, or `findUnique` + apply the `@default(true)` fallbacks in code (a settings row may not exist until glassTier is first set — see `glass-tier-setting.integration.test.ts:52`).

### 1d. Exam CTA forms
- `startTestAction` defined at **`app/actions/test.ts:26`** (`"use server"`, `(formData: FormData): Promise<void>`); forms wire it as `<form action={startTestAction}>` + hidden `name="mode"`.
- **Forms that can submit `mode=EXAM_SIMULATION` (only two):**
  1. **`app/(app)/dashboard/page.tsx:278`** — `<StartButton mode="EXAM_SIMULATION" …/>`; `StartButton` helper defined L33–40 renders `<form action={startTestAction}>` + hidden mode input; form region is the `#exam` anchor block **L261–282** (hardcoded literal).
  2. **`app/(app)/test/[id]/result/page.tsx:101`** — "Пройти ще раз" `<form action={startTestAction}>` with `<input type="hidden" name="mode" value={session.mode} />` (L102) — submits EXAM_SIMULATION only when the finished session WAS an exam (`isExam = session.mode === "EXAM_SIMULATION"`, L26). Dynamic, not literal.
  - (All other `startTestAction` forms use non-exam modes: dashboard L35/L236, saved L23, progress L34, mistakes L26, practice L66/101/116/135, readiness-dial.tsx L126, result L118.)
- **`SubmitButton`** = `components/submit-button.tsx`, **L1 `"use client"`** — client component using `useFormStatus()` (L20); MUST render inside the `<form>`. It does NOT itself intercept submit.
- **§C intercept pattern (per `components/CLAUDE.md`):** `<form action={startTestAction} onSubmit={handler} noValidate>` — `event.preventDefault()` in `onSubmit` stops React 19 from invoking the server action, letting the ritual gate run, then re-submit programmatically. Intercept must live in a client wrapper around these two forms.

### 1e. `/progress` page structure — `app/(app)/progress/page.tsx`
- Component idiom: `Card` + `SectionTitle` from `@/components/ui` (import L6). `ProgressPage` (L55–97) is ONE top-level `<div className="space-y-6">` (L63). The **whole page IS the wave12b «Карта тем» section**: raw header `<h1>Карта тем</h1>` + subtitle **L64–70**; body **L72–95** = empty-state `<Card>` (L73–77) OR `GROUPS.map(...)` (L79–94) rendering per band `<SectionTitle hint={hint}>{heading}</SectionTitle>` + `<Card><ul className="divide-y divide-black/5">…</ul></Card>`. Groups weak/learning/strong → «Вивчаю»/«Майже»/«Впевнено» (L15–23).
- **Calibration section fit:** new sibling block inside the `space-y-6` div — cleanest **after the header (after L70) and before the topic-map body (L72)** so it reads above the long list, OR as last child before `</div>` (L96). Follow the idiom: `<div><SectionTitle hint="…">Калібрування</SectionTitle><Card>…</Card></div>`.

### 1f. Account surface — `app/(app)/account/page.tsx`
- `AccountPage` (default export L47) fetches `requireUser()` + `Promise.all([getAnalyticsOptOut(), getOrCreateProfile(...), getGlassTierOverride(...)])` (L48–53), then renders a vertical stack of `Card` sections: header 57–60, email 62–64, **Дата іспиту** 66–74, **Денна ціль** 76–81, **Серія навчання** 83–113, **Оформлення**/glass 115–120, **Зміна пароля** 122–127, **Конфіденційність**/analytics opt-out **129–134**, then `<OfflinePacksCard/>` (137) and `<InstallHint/>` (140).
- **wave12b-14 inline-`"use server"` wrapper pattern (VERBATIM, L21–37):**
  ```tsx
  // The settings actions live in `server-only` modules, so the client forms receive
  // them as bound "use server" wrappers, adapted to the useActionState signature.
  async function submitExamDate(
    _prev: StudyProfileActionState | null,
    formData: FormData,
  ): Promise<StudyProfileActionState> {
    "use server";
    return setExamDateAction(formData);
  }
  ```
  (Same shape for `submitDailyGoal` L31–37, `submitGlassTier` L39–45; each passed as the `action` prop to a client form component: `ExamDateForm` L71, `DailyGoalForm` L80, `GlassTierForm` L119.)
- **Link to `/account/data` belongs** in the **Конфіденційність** Card (L129–134, the privacy anchor next to `AnalyticsOptOutToggle`) — insert after L133, or as a new `Card` right after L134 (before `OfflinePacksCard`).

### 1g. Data-rights enumeration — `prisma/schema.prisma` (delegate · user-scope · onDelete)
All 14 chains to User are **onDelete: Cascade** — deleting a User cascades to ALL of them (no Restrict/NoAction/SetNull on the User side):

| Model | delegate | user where | onDelete (line) |
|---|---|---|---|
| User | `user` | `{ id: userId }` | root (id L25) |
| UserStudyProfile | `userStudyProfile` | `{ userId }` (unique) | Cascade **L359** |
| StudyDay | `studyDay` | `{ userId }` | Cascade **L378** |
| ReviewState | `reviewState` | `{ userId }` | Cascade **L288** |
| ReviewLog | `reviewLog` | `{ userId }` | Cascade **L315** |
| TopicMastery | `topicMastery` | `{ userId }` | Cascade **L340** |
| ReadinessSnapshot | `readinessSnapshot` | `{ userId }` | Cascade **L392** |
| TestSession | `testSession` | `{ userId }` | Cascade **L175** |
| TestAnswer | `testAnswer` | **indirect** `{ testSession: { userId } }` (no userId col) | via parent, `testSession` Cascade **L211** |
| TestSessionQuestion | `testSessionQuestion` | **indirect** `{ testSession: { userId } }` (no userId col) | via parent, `testSession` Cascade **L199** |
| UserMistake | `userMistake` | `{ userId }` | Cascade **L232** |
| SavedQuestion | `savedQuestion` | `{ userId }` | Cascade **L252** |
| UserSettings | `userSettings` | `{ userId }` (unique) | Cascade **L410** |
| NotificationLog | `notificationLog` | `{ userId }` | Cascade **L442** |

- **Adjacent Restrict flags (Question-side, NOT User-side — do NOT block User delete):** `ReviewState.question` Restrict **L290**, `ReviewLog.question` Restrict **L317** (block deleting a Question, not a User). **`AnalyticsEvent.user` is `onDelete: SetNull` L461** — a deleted user leaves anonymized AnalyticsEvent rows; §D export correctly EXCLUDES AnalyticsEvent (pseudonymous telemetry) and delete leaves them nulled, not removed.
- **User scalars** (L24–38): id L25 · name L26 · email L27 · **passwordHash L28 (EXCLUDE)** · **tokenVersion L31 (EXCLUDE)** · role L32 · selectedCategoryId L33 · language L35 · createdAt L36 · updatedAt L37 · lastActiveAt L38. **Safe export set:** `id, name, email, role, selectedCategoryId, language, createdAt, updatedAt, lastActiveAt`.

### 1h. Admin — `app/admin/layout.tsx`
- `NAV_LINKS` at **L8–17**; last entry `{ href:"/admin/readiness-shadow", label:"Готовність (тінь)" }` L16. **Insert new entry at L17** (after L16, before `];`). href pattern = flat `{ href:"/admin/<slug>", label:"<uk label>" }` (`NavLink` type imported L6; array reused by `AdminNav` L51 + `AdminBreadcrumbs` L56).
- `QuestionExplanation.reviewedStatus` — **`prisma/schema.prisma:151`**: `reviewedStatus String @default("UNREVIEWED") // UNREVIEWED | REVIEWED | NEEDS_FIX` (plain String, not a prisma enum; UI labels `app/admin/questions/question-editor.tsx:16`).
- `Question.difficulty` — **`prisma/schema.prisma:97`**: `difficulty Int @default(1) // 1=easy .. 5=hard` (Int 1..5; do NOT confuse with `ReviewState.difficulty` Float 1..10 FSRS "D" at L294).
- **Unreviewed-queue link:** the admin question list is `app/admin/questions/page.tsx`, but **NO `reviewedStatus` filter exists yet** — `SP` searchParams (L51–61) support only `q,status,demo,image,source,category,topic,sort,page`; the `status` param (L78, values via `QUESTION_STATUS_FILTERS` `lib/server/admin.ts:140`) is publish-state, not review-state. `listQuestionsFiltered`/`QuestionListFilters` (`lib/server/admin.ts:236`/`:156`) have no reviewedStatus. So the queue link either needs a NEW filter param (mirror L78) or must point at an existing coarse filter — flag for wave14-11/12.
- **`lib/content-flags.ts` exports** (reusable by §E): `ContentFlagKind` type L14–17 (`"WRONG_KEY_SUSPECTED"|"LOW_DISCRIMINATION"|"INSUFFICIENT_DATA"`) · `ContentFlag` interface L20–24 (`{kind,label,evidence:Record<string,number>}`) · `FlagOptions` L27–30 (`{minSample:number}`) · **`flagQuestion(stat: QuestionSummary, {minSample}: FlagOptions): ContentFlag[]`** L59–62. `OptionStat`/`QuestionSummary` come from `./content-stats`. (uk `LABELS` L33–37 and `LOW_DISCRIMINATION_HALF_WIDTH=0.08` L44 are module-private.)

### 1i. Nightly job — `scripts/nightly-readiness.ts` (83-line base)
- **No CLI flags** — only input is `process.env.DATABASE_URL` (L23, fallback `file:./prisma/dev.db`). Owns its OWN `new PrismaClient({ adapter: new PrismaLibSql({ url }) })` (L22–24) to avoid the `server-only` taint.
- **CHUNK pattern:** `const CHUNK = 200;` (**L27**) bounds both user paging (`findMany take:CHUNK`, cursor-paged L35–41, advance L67, break L42/L66) and id-list `{ id:{ in:[…] } }` reads (`for(i;i<questionIds.length;i+=CHUNK)` L52–58; libsql P2029 param-cap guard).
- **Structure:** outer `for(;;)` page loop (L33) → inner `for(const user of users)` (L44–64): gather distinct topic ids (L46–58) → `recomputeTopicMastery(user.id, [...topicIds], prisma)` (**L61**) + `recomputeReadiness(user.id, user.selectedCategoryId ?? null, prisma)` (**L62**) → `processed += 1` (L63). Summary `console.log` L71.
- **Where to append a step:** per-user step → after **L62** (before `processed += 1`). Once-per-run step (e.g. §F analytics prune) → after the outer loop closes at **L68**, before the summary log L71.
- **Launcher:** launchd plist **`ops/com.drivers.nightly-readiness.plist`** — `ProgramArguments` L9–15 = `/opt/homebrew/bin/npx tsx --conditions=react-server scripts/nightly-readiness.ts`; schedule `StartCalendarInterval` Hour 3 Min 30 (L25–29); `WorkingDirectory` = repo root L21. Install/ops instructions `ops/README.md:6-36` (`launchctl bootstrap gui/$(id -u)…` L23–25; kickstart/bootout L31–33).

### 1j. Browser audit — `bin/browser-audit.sh`
- **Assert helpers:** counters/reporters L35–38 (`ok()`=pass+say, `bad()`=fail+say); state getters L40–44 (`url()`=`get url`, `body()`=`get text "main"`, `nav()`). `assert_url <substr> <label>` L46–52 (case-sensitive glob against browser URL). `assert_text <substr> <label>` L53–55 (`body | grep -qiF -- "$1"` — case-insensitive against `main` text). No other named `assert_*`; richer checks use inline grep/eval + direct `ok`/`bad`. `login`/`logout` L57–69.
- **Section layout (NOT a clean two-block split):** seeded-user §1–§8 **L84–164** (first `login "$USER_EMAIL"` L84); FRESH-USER §9 **L166–211** (`logout` L170, unique `FRESH_EMAIL="audit-$(date +%s)@drivers.school"` L171); switches BACK to seeded at §10 **L216–217**; §12–§15 transport/PWA/offline L267–358 (end logged-out, last `logout` L351); teardown `close --all` L360; exit `[ "$fail" -eq 0 ]` L364.
- **Where to append §G asserts:** authed seeded-user checks → **L265** (after §11 result-lane block, seeded session still active). If they must run before teardown regardless → new block before **L360**, but §12–15 leave the browser logged-out, so add a fresh `login` first. New `ok`/`bad` calls integrate into the exit status automatically.

### 1k. Confidence uptake
- **Sampling:** constant `CONFIDENCE_SAMPLE_RATE = 5` at **`lib/constants.ts:197`**. Pure sampler `isConfidenceSampled(sessionId, questionId)` = `fnv1a32(sessionId+":"+questionId) % CONFIDENCE_SAMPLE_RATE === 0` at **`lib/confidence-sampling.ts:28-29`**. **Only production call site:** `components/test-runner.tsx:538` (`isConfidenceSampled(sessionId, q.questionId) &&`, import L8) — gates the "Наскільки впевнені?" follow-up chip. (Other refs are tests only.)
- **Counting sampled answers:** `ReviewLog.confidence Int? // 1..4` at **`prisma/schema.prisma:325`** (nullable). Written at `lib/server/study.ts:173` (`confidence: confidence ?? null` in the reviewLog create; validated `lib/validation.ts:68,89`). Count via `prisma.reviewLog.count({ where: { userId, confidence: { not: null } } })`. Uptake % = that over answered/eligible. (Also `ReviewState.lastConfidence` schema L301 and a session-question `confidence` L219 exist, but the append-only spine to count is **ReviewLog.confidence**.)

## Risks
- **§C client-bundle trap (CLAUDE.md 1st learning):** the calm-ritual interceptor is a client component wrapping the two exam forms (1d). It must NOT import server-graph modules (`@/lib/rbac`, `@/lib/auth`, `@/lib/db`) — importing `@/lib/server/study.ts` client-side pulls bcrypt/`node:module` → Turbopack build error. It CAN import the `"use server"` action reference `startTestAction` (safe — resolves to an action ref, not code). Compute anything server-derived in the page and pass as plain props. The one analytics event (`calm_ritual_started`/`skipped`) must be added to `ANALYTICS_EVENTS` (`lib/constants.ts`) before use or typecheck fails.
- **wave12b-10 stale-server / audit-rebuild trap:** §G adds new routes (`/account/data`, `/admin/learning-health`, `/progress` calibration section) AND changes client components. `next start` loads `.next` once at boot and does NOT hot-reload; `verify.sh` rebuilds under the live server, so (a) a NEW route 404s until the LAN server is restarted, and (b) after a CLIENT-component change the content-hashed chunk filenames change and the booted server references deleted chunks → client nav renders nothing while URL-level asserts stay green. Fix: kill + relaunch `npm run start -- -H 0.0.0.0 -p 3100` (and the `localhost:3100` E2E server) against the fresh build before re-running the audit. This is environment setup, not feature-code patching.
- **§D delete cascade — ALL 14 tables confirmed Cascade to User** (1g): no Restrict/NoAction/SetNull blocks a User delete. The two Restrict FKs (`ReviewState.question` L290, `ReviewLog.question` L317) are Question-side only. `AnalyticsEvent.user` is `SetNull` L461 (by design — telemetry survives anonymized, excluded from export per spec). So the delete relies purely on schema cascades and needs NO migration. Residual risk: the seed's FK-safe reset block already handles Restrict children — an account-delete integration test that provisions ReviewState/ReviewLog rows must let the User cascade clear them (delete the User, not the questions).
- **Additional (non-blocking) gaps for downstream tasks:** no `getOrCreateSettings` helper exists (1c — notif reader must add one or apply `@default(true)` in code); no `reviewedStatus` filter param on the admin question list yet (1h — the "unreviewed queue" link needs a new filter or a coarse fallback); `profile.examDate` is not currently read on the dashboard (1a — EXAM_COUNTDOWN nudge must add the read); `recomputeReadiness` reads `calibrationSlope` from the profile internally, so §B only needs the nightly to REFRESH `UserStudyProfile.calibrationSlope` — no signature change (1b).

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-02T21:05Z ClPcs-Mac-mini driver: read spec + walked items 1a–1k via 4 parallel Explore agents; recorded `## Findings` (a–k, all with file:line pointers) and `## Risks` (client-bundle §C, wave12b-10 stale-server, §D cascade confirmed all-14-Cascade, plus downstream gaps). No production files touched — investigation only. Set Status: done.

## Verify
**Last verify:** PASS (2026-07-02T21:00:07Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:01:02Z)
