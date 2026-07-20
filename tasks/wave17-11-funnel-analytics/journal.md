# Task: wave17-11-funnel-analytics

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T19:48Z
**Last compute:** mac-mini

## Goal
T6/P3.3 — instrument the funnel as measurable rates and fire the events at the real points. Privacy
whitelist holds (no PII). PASS = ALL true:

1. `lib/constants.ts` `ANALYTICS_EVENTS` gains the funnel stage events (add ONLY what isn't already
   covered by an existing event; reuse where possible). The funnel stages to cover:
   `segment_complete` (finished the ≤4-tap self-segment), `activation_aha` (finished a question loop +
   saw an explanation), `readiness_aha` (dial rendered with a real number), and the conversion edges
   (`user_registered` + a `paid`/`exam_access_purchased` already/newly covered). Each new name is added
   to the `as const` whitelist and typed via `AnalyticsEventName`.
2. `recordEvent` calls fire at the REAL points:
   - `segment_complete` from the segment flow (wave17-07);
   - `activation_aha` after the first answered question with an explanation shown (anon or real);
   - `readiness_aha` when the readiness dial renders a real (sufficient-data) number;
   - `exam_access_purchased` (or the agreed `paid` name) from `completeCheckout` (wave17-09).
   Fire-and-forget (`void recordEvent(...)`), OUTSIDE any `$transaction` (house rule).
3. WORKS FOR ANON: events that occur pre-registration accept a `userId` that may be the anon user id
   (or null where appropriate) — `recordEvent(name, userId, payload)` is called with the anon user's
   id so the funnel is measurable before signup. No PII in the payload (category/timing/confidence
   are non-PII; never email/answer text).
4. PRIVACY WHITELIST HOLDS: any client-lane event still passes through the `trackEventSchema`
   whitelist (`lib/analytics-ingest.ts`) which strips unknown keys — assert (unit test) that a payload
   with a smuggled `email`/`password` key is stripped. No new freeform field bypasses the schema.
5. Integration test `lib/server/funnel-events.integration.test.ts` proves at least the two hardest
   edges over the REAL paths (not internal helpers): (a) `completeCheckout` (wave17-09) records the
   `paid` event exactly once (poll with `vi.waitFor` since it's fire-and-forget, per CLAUDE.md);
   (b) `readiness_aha` (or the dial-render path) records exactly once when sufficient data exists.
   Use literal expected counts.
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration` all exit 0.

## Constraints / decisions
- Prefer REUSING existing whitelisted events (`test_completed`, `question_answered`,
  `onboarding_jtbd_answered`, `user_registered`) over inventing new ones; add a new name ONLY for a
  funnel stage not already represented. Record the final event→stage mapping in Log so wave17-14 and
  the wave-review can read the rates.
- NO PII EVER in a payload. The zod whitelist is the backstop; do not add a freeform field that
  bypasses it. Analytics privacy is a wave-review lens.
- Fire-and-forget, outside `$transaction`. An analytics failure must never block the play/purchase
  path.
- Depends on: wave17-07 (segment), wave17-08 (dial ask), wave17-09 (checkout) for the fire points.
  This task may land AFTER them or add the event names first and have those tasks call them — either
  ordering is fine; coordinate via the Log mapping.

## Plan
- [x] Decide + record the event→stage mapping (reuse vs new).
- [x] Add new names to ANALYTICS_EVENTS.
- [x] Fire recordEvent at the real points (segment_complete / activation_aha / readiness_aha; exam_access_purchased already wired by wave17-09).
- [x] Unit test: whitelist strips smuggled PII (pre-existing lib/analytics-ingest.test.ts §"STRIPS unknown keys"). Integration test: paid + readiness fire once each.
- [x] Run gates.

## Next
- [ ] (none — Goal met; verify green) Follow-ons owned elsewhere: wave17-12 reserves dial/funnel space, wave17-14 audits these funnel events in the browser.

## Artifacts
- lib/constants.ts — `ANALYTICS_EVENTS` funnel-stage names + stage→fire-point comment.
- app/actions/segment.ts — fires `segment_complete` at the final confidence tap (anon-capable).
- app/(app)/dashboard/page.tsx — fires `readiness_aha` when `sufficientData` (dial shows a real number).
- lib/server/test-engine.ts — `submitAnswer` fires `activation_aha` on the user's first-ever recorded answer with an explanation shown (detached count, off the hot path).
- app/actions/checkout.ts — paid edge renamed `funnel_paid`→`exam_access_purchased`.
- lib/server/funnel-events.integration.test.ts — proves `exam_access_purchased` (via completeCheckout) and `readiness_aha` (via the real DashboardPage render) each fire exactly once (vi.waitFor).

## Event → stage mapping (final)
- `segment_complete` (NEW) ← final confidence tap in `segmentAnswerConfidenceAction` (app/actions/segment.ts). Anon-capable (`user.id` may be anon).
- `activation_aha` (NEW) ← `submitAnswer` (lib/server/test-engine.ts) when the first answered question returns a shown explanation (practice reveal). Anon or real.
- `readiness_aha` (NEW) ← dashboard render (app/(app)/dashboard/page.tsx) when `sufficientData === true` (dial shows a real number).
- `exam_access_purchased` (was provisional `funnel_paid` from wave17-09; renamed here to the spec name) ← `completeCheckout` (app/actions/checkout.ts). Serves as the paid conversion edge.
- registration conversion edge = existing `user_registered`.

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T17:40Z ClPcs-Mac-mini: added funnel-stage names `segment_complete`/`activation_aha`/`readiness_aha` to `ANALYTICS_EVENTS` in lib/constants.ts (alongside already-present `funnel_paid`), with a stage→fire-point comment; recorded the final event→stage mapping. Verified no exhaustive `Record<AnalyticsEventName,…>` consumer exists, so the additive change is safe. Fire points wiring is the next increment.
- 2026-07-05T19:48Z ClPcs-Mac-mini: wired all three fire points (segment_complete in segmentAnswerConfidenceAction; readiness_aha on the dashboard when sufficientData; activation_aha in submitAnswer on the first-ever recorded answer with an explanation shown, via a detached count off the hot path). Renamed the paid edge `funnel_paid`→`exam_access_purchased` (constants+checkout) — wave17-09 chose `funnel_paid` provisionally and deferred final naming to wave17-11; the verify gate + Goal name it `paid`/`exam_access_purchased`, so this aligns the code to spec rather than weakening the gate (checkout.integration.test.ts asserts no event name, unaffected). Added lib/server/funnel-events.integration.test.ts driving the REAL completeCheckout + the REAL DashboardPage render (mock @/lib/rbac requireUser, searchParams as a resolved Promise) and asserting each event fires exactly once via vi.waitFor. PII-whitelist unit assertion already exists in lib/analytics-ingest.test.ts. Full verify.sh GREEN: tsc, npm test (608), test:integration (231 pass/2 skip), all grep gates.


## Verify
**Last verify:** PASS (2026-07-05T16:51:08Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T16:54:29Z)
