# Wave 12b — Learner surfaces: honest dial as hero, plan card, adaptive entries, runner UX, mastery map

The NEW learner-facing surfaces, built ONCE in the Wave-12a design system (tokens/glass tiers/capsule are
LAW — reuse `components/ui.tsx`, `.glass-e1/e2`, `Svitlyk`, the taste rules; reading content OPAQUE; only
this wave may add up to the ≤2 signature `.lens` refraction surfaces). Sources of truth:
`docs/app-plan/01-information-architecture.md` + `02-features.md` + `04-design-system.md`,
`docs/app-plan/UX-FINDINGS-2026-07-02.md` (W12 items), the W11-review deferrals (in PLAN.md 2026-07-02
closure). RULES unchanged (CLAUDE.md; production-path integration tests; `npx vitest list` proof;
Ukrainian; legal positioning; NO monetization/PWA/notifications — W13/14).

## A. Dashboard rework — ONE honest readiness metric (the dial becomes the hero)
- Replace the legacy dual display (ring + «N зі 100» card — they DISAGREE today, UX-FINDINGS) with ONE
  dial component fed by `getLatestReadiness` (W11): `sufficientData=false` → NO number, NO verdict — a
  calm «Ще недостатньо даних — дайте відповідь на N питань» + progress toward the 20-seen threshold;
  `true` → `dialPercent` count-up (reduced-motion: jump to final) + the bottleneck topic line
  («найслабше: …» + one-tap practice link). The dial card MAY be a signature `.lens` on the real tier
  (emulated elsewhere). Legacy `ReadinessMeter`/`examReadiness` display REMOVED from learner surfaces
  (stays for admin/shadow). Legal disclaimer stays.
- Recommended action BRANCHES on state (UX-FINDINGS): brand-new/thin-data → «Змішана практика» (no-stakes)
  NEVER the timed exam; recent mock FAILED → corrective framing («почнімо з найслабших тем», link) —
  never «Тримайте темп»; passing streak → keep pace + exam suggestion. Pure `lib/recommend-action.ts`
  (state → {kind, copy-key}) UNIT-TESTED for the matrix; copy in the component.
- Plan card «Сьогоднішній план»: `getStudyPlan` (W11) → «≈N питань · M хв» + one-tap start (=
  ADAPTIVE_REVIEW via the existing action); shows daily-goal progress (StudyDay) + streak/«дні практики»
  + вихідний (freeze) count — detoxified copy, never punitive. Consolidate the duplicate «Почати
  симуляцію» buttons into the exam section (§C).

## B. Practice entries — the adaptive family goes learner-visible
- Mode cards on /practice: «Розумне повторення» (ADAPTIVE_REVIEW) + «Інтервальне повторення»
  (SPACED_REVIEW, with a live DUE-count badge). SPACED with nothing due → the calm state: «Нічого не
  заплановано на сьогодні — пам'ять ще тримає. Повернись завтра.» (+ Світлик) — NOT an error.
  Existing mode cards restyled order: adaptive family first, then themes, then exam-adjacent.

## C. Exam area (the capsule's «Іспит» target)
- A real `#exam` section on /dashboard (или small dedicated section — NO new route): calm graded-exposure
  framing (format chip 20·20·≤2, «це тренування формату, не вирок»), the single «Почати симуляцію» CTA.
- Result screen: top summary «Найбільше помилок у темах: X, Y, Z» (from the session's wrong answers,
  grouped by topic, max 3) each linking to TOPIC_PRACTICE; outcome-appropriate headline (fail = supportive
  + corrective, pass = calm-positive); unanswered questions labelled «без відповіді», not «помилка».

## D. Runner interaction upgrades (behavior; visuals are 12a-done)
- STICKY compact header during a session: timer (exam) + «N з 20» + thin progress — always visible
  (UX-FINDINGS: the timer scrolled away exactly while reading options).
- Thumb-zone sticky bottom action bar on phone: Далі / Завершити (≥44px), replacing mid-content pager
  placement; desktop keeps inline.
- Digit keys 1–4 select options (desktop); existing arrow/roving preserved.
- After answering in practice: auto-scroll the explanation into view (reduced-motion: instant jump).
- Touch swipe left/right navigates questions (simple pointer/touch delta, no library).
- Confidence sampling (the W11 plumbing goes live): AFTER submitting on a SAMPLED ~1-in-5 of practice
  (non-exam) answers, a small optional «Наскільки впевнено?» 1–4 chip row (skippable, never blocks);
  sends `confidence` with the SAME clientEventId attempt semantics — NOTE: confidence arrives AFTER the
  first submit → needs a tiny follow-up action (`setAnswerConfidence(sessionId, questionId, confidence)`
  updating TestAnswer.confidence + the ReviewLog row of that attempt; server-side, validated, self-only).
  Deterministic sampling (hash of sessionId+questionId — pure helper, unit-tested), no Math.random in lib/.
- Persist current question INDEX in the URL hash or sessionStorage so reload resumes at the same question.

## E. Onboarding + Профіль
- Onboarding after category: OPTIONAL exam-date + daily-goal steps (skippable; profile actions from W11);
  finishing shows the first plan («~N днів × M питань — встигаєш спокійно»). Calm, ≤3 steps, В default stays.
- /account: exam date + daily goal editing (same actions), glass-tier setting (auto/real/emulated/solid →
  UserSettings), streak/вихідний status view. Ukrainian client-side validation on register/login/account
  forms (replace English browser tooltips: required/email/minlength messages via JS validity handling or
  zod-on-client — pick the lightest; UX-FINDINGS).

## F. Progress — «Карта тем» (the anti-leaderboard mastery view)
- /progress gains the 65-topic map grouped by band (Вивчаю / Майже / Впевнено) from TopicMastery
  (mean R decay = honest slip-back), each topic → TOPIC_PRACTICE link; private, no ranks, no percents
  beyond the band; weakest topics surfaced first. Keep existing history/sparkline content below, restyled.

## G. Server chores absorbed (W11-review deferrals)
- finishSession recompute+streak made RETRYABLE: extract to an idempotent `finalizeSession(sessionId)`
  step keyed off the COMPLETED session (safe to re-run; called inline + re-callable), so a transient
  recompute failure can't be lost. Integration-test the re-run idempotence.
- De-dupe the double `getOrCreateProfile` upsert on the finish path; reconcile streak↔StudyDay so a
  goalMet day and the streak walk agree (one source of truth: StudyDay rows).

## H. Verification
- Suite + build + drift-zero as always. `bin/browser-audit.sh` extensions (keep style): dial
  insufficient-data state renders for a fresh user; plan-card start lands in /test/ with mode
  ADAPTIVE_REVIEW; SPACED nothing-due shows the calm state (fresh user); result-screen topic summary
  renders after a finished exam (the audit already finishes one). Digit-key/swipe = unit/component-level
  only (audit tool can't synthesize reliably). Design-shots re-run at the end (the 12a script; its
  content-aware precheck comes from the 12a fix batch).
- Integration: confidence follow-up action (production path: sampled → set → persisted on TestAnswer +
  ReviewLog, replay-safe); finalizeSession idempotence; recommend-action matrix already unit-level.

## Out of scope: PWA/offline/images (W13), notifications/Web Push/breathing/data-export/learning-health
(W14), monetization, admin redesign, new refraction lenses beyond the dial (≤2 total co-visible).
