# Wave 14 — Engagement, telemetry, calm-nerves, data rights (the program's final wave)

Per `docs/app-plan/00-MASTER-PLAN.md` W14 + `05-tech-architecture.md` §1.8/§6 + the W13-review refinements.
Tone law: calm/credible — nudges NEVER guilt/FOMO; Світлик appears at true emotional beats only, no emoji in
notifications. Web Push stays DEFERRED (no public origin); everything ships in-app. RULES unchanged
(CLAUDE.md; purity split; additive-only migrations IF needed; production-path tests; frontend-design craft
rules: copy direct, action names persist, empty states invite; `npx vitest list` proof).

## A. In-app nudges (NotificationLog goes live; ≤3–4/week guard)
- `lib/server/nudges.ts`: `computeDueNudges(userId, now)` decides AT MOST ONE nudge per day per user from:
  REVIEW_DUE (due count > 0 at first dashboard visit of the day), EXAM_COUNTDOWN (exam date within 7/3/1
  days), DAY_OFF_OFFER (streak alive + yesterday goalMet + today empty evening — Світлик offers the
  вихідний), READINESS_MILESTONE (dial crosses 25/50/75 with sufficientData). Persist via `NotificationLog`
  (kind, channel "inapp", dedupeKey `<kind>:<day>:<userId>` — the existing unique) and enforce a rolling
  **≤4 per 7 days** cap in code (count SENT rows in the window before emitting). PURE decision logic in
  `lib/nudge-policy.ts` (injected now/state; unit-tested matrix incl. the cap and the one-per-day rule).
- Dashboard renders the day's nudge as ONE quiet dismissible card (dismiss = mark `status: "SENT"` +
  `sentAt`; never re-shown same day). Copy per kind: calm, first-person Світлик ONLY for DAY_OFF_OFFER,
  functional voice otherwise, zero emoji. `UserSettings.notif*` toggles respected (settings UI exists).

## B. Confidence calibration panel (learner-facing, honest)
- `lib/calibration.ts` (PURE): bucket ReviewLog rows WITH confidence (1..4) × correctness → per-bucket
  accuracy + a simple over/under-confidence summary; requires ≥`CALIBRATION_MIN_SAMPLES` (20) sampled
  answers else insufficient-data state. **The panel MUST state the offline exclusion (W13-review): offline
  reviews carry no confidence and are absent from this view.**
- `/progress/calibration` section (inside /progress, no new route): «Коли ви впевнені — ви маєте рацію в
  N%» framing; insufficient state invites: «Відповідайте на питання про впевненість — і побачите, наскільки
  ваше відчуття збігається з результатом». Server aggregation chunked; nightly job also refreshes
  `UserStudyProfile.calibrationSlope` from the same buckets (feeds the readiness discount — wire the slope
  into `recomputeReadiness`'s existing parameter if not already).

## C. Pre-exam calm ritual (the breathing moment)
- Optional 60-second breathing screen between the exam CTA and `startSession`: Світлик's green lamp as the
  pacer (CSS scale/opacity breathing at 4-7-8-ish rhythm, `prefers-reduced-motion` → a static calm text
  alternative), skippable ALWAYS («Почати одразу»), never forced twice a day (localStorage). Copy:
  «Хвилина спокою — і починаємо. Це тренування формату, не вирок.» No timers/pressure on this screen.
- Client-only component + one analytics event (`calm_ritual_started`/`skipped` — add to ANALYTICS_EVENTS).

## D. Data rights — `/account/data` (export + delete)
- Export: a server action streaming a JSON file of the user's OWN data — **enumerate ALL learning-state
  tables (W13-review): User (safe fields), UserStudyProfile, StudyDay, ReviewState, ReviewLog,
  TopicMastery, ReadinessSnapshot, TestSession+TestAnswer(+TestSessionQuestion), UserMistake,
  SavedQuestion, UserSettings, NotificationLog** (chunked reads ≤200; no other users' data; no
  AnalyticsEvent — it's pseudonymous product telemetry, state that in the UI copy). Note in the UI:
  offline/IndexedDB data lives only on the user's device.
- Delete: type-to-confirm («ВИДАЛИТИ») server action — cascade wipes the account (the schema's onDelete
  cascades do the work; Restrict FKs are question-side and unaffected), destroys the session, redirects to
  a calm goodbye page. Integration tests: export contains a seeded row from EVERY enumerated table;
  delete leaves ZERO rows across them + the user cannot log in after.

## E. Admin learning-health (`/admin/learning-health`)
- `requireContentManager()`. Aggregates (chunked, privacy-safe): explanation REVIEWED coverage % + the
  unreviewed queue count (link to the existing admin question filter), observed-difficulty vs authored
  difficulty outliers (reuse `lib/content-flags.ts` + ReviewLog grade aggregates per question — the
  "generation = free data audit" loop with live behavior), confidence-sampling uptake %, nudge volume last
  7d, readiness-shadow summary link. Nav «Здоровʼя навчання» after «Готовність (тінь)».

## F. Analytics pruning job
- Extend `scripts/nightly-readiness.ts` (same launcher/flags): delete `AnalyticsEvent` rows older than
  `ANALYTICS_RETENTION_DAYS` (180) in chunks ≤500; log the count. Idempotent; constants in lib/constants.

## G. Verification (final gate = the program's last)
- Full suite + build + drift check (additive-only if any migration at all — expected NONE) +
  `npm run audit:browser` extended: the nudge card renders for a seeded due-review user; /progress shows
  the calibration section (insufficient state); /account/data page renders both actions; admin
  learning-health renders + RBAC-bounces a USER; the breathing screen appears on the exam path and
  «Почати одразу» skips it into a real session. All Ukrainian, zero emoji in nudge copy (grep gate).

## Out of scope: Web Push/VAPID/off-box scheduler (deferred until a public origin exists) · monetization ·
Postgres · new modes · landing work · FSRS per-user optimizer.
